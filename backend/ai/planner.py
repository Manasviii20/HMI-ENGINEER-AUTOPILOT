"""Requirement Analyzer + Engineering Planner.

Converts a free-text engineering requirement into a structured EngineeringPlan,
grounded ONLY in tags/screens/assets that actually exist in the project graph.
Uses the LLM when configured; otherwise falls back to a deterministic mock
planner that demonstrates the same workflow without an API key.

The mock planner is a small rule engine (not just a handful of hardcoded
keywords) so it can handle a wide variety of phrasings: it tokenizes the
requirement, fuzzily matches word tokens against the *actual* tags in the
project (never inventing a tag name), infers a sensible object type per
match, and separately parses alarm/navigation intent per clause.
"""
import json
import re
from pydantic import ValidationError

from backend.models.project import Project, Tag
from backend.models.engineering import EngineeringPlan
from backend.graph.project_graph import ProjectGraph
from backend.ai.llm_client import llm_client
from backend.hmi.screen_generator import slugify
from backend.graph.graph_builder import build_graph

SYSTEM_PROMPT = (
    "You are an HMI engineering planner. You convert a requirement into a JSON "
    "EngineeringPlan. You may ONLY reference tags and screens given in the context. "
    "NEVER invent tag names, screen ids, or engineering facts. If information is "
    "missing, add it to 'unknowns' instead of guessing. Respond with JSON only, "
    "matching this schema: {\"summary\": str, \"actions\": [ {\"action\": "
    "\"CREATE_SCREEN|ADD_OBJECT|CREATE_ALARM|ADD_NAVIGATION\", ...fields}], "
    "\"unknowns\": [str]}."
)

# --- generic helpers -------------------------------------------------------

STOPWORDS = {
    "a", "an", "the", "add", "new", "create", "make", "some", "is", "of", "to",
    "on", "with", "and", "for", "that", "this", "it", "its", "be", "should",
    "please", "also", "an", "screen", "page", "view", "showing", "show",
    "display", "displays", "displaying",
}

ALARM_STRUCTURAL_WORDS = {
    "alarm", "alert", "warning", "when", "if", "exceeds", "exceed", "above",
    "over", "below", "under", "greater", "than", "less", "equal", "equals",
    "reaches", "hits", "goes", "gets", "becomes", "trigger", "triggers",
    "create", "add", "an", "a", "the",
}

COMPARISON_WORDS = {
    "above": "GT", "over": "GT", "exceeds": "GT", "exceed": "GT", "greater": "GT",
    "more": "GT", "higher": "GT",
    "below": "LT", "under": "LT", "less": "LT", "lower": "LT", "fewer": "LT",
    "equal": "EQ", "equals": "EQ", "is": "EQ", "at": "EQ",
    "not": "NEQ",
}

SEVERITY_WORDS = {
    "critical": "CRITICAL", "urgent": "CRITICAL", "emergency": "CRITICAL",
    "high": "HIGH", "important": "HIGH", "severe": "HIGH",
    "medium": "MEDIUM", "moderate": "MEDIUM",
    "low": "LOW", "minor": "LOW",
}

# Word tokens that hint at a natural HMI object type for the matched tag,
# independent of whether the requirement used that exact word.
ROLE_TYPE_HINTS: dict[str, str] = {
    "speed": "GAUGE", "rpm": "GAUGE", "rate": "GAUGE", "pressure": "GAUGE",
    "temperature": "VALUE_DISPLAY", "temp": "VALUE_DISPLAY",
    "overload": "STATUS_INDICATOR", "run": "STATUS_INDICATOR", "running": "STATUS_INDICATOR",
    "status": "STATUS_INDICATOR", "state": "STATUS_INDICATOR",
    "sensor": "STATUS_INDICATOR", "stop": "STATUS_INDICATOR", "emergency": "STATUS_INDICATOR",
    "comm": "STATUS_INDICATOR", "comms": "STATUS_INDICATOR", "communication": "STATUS_INDICATOR",
}

EXPLICIT_TYPE_WORDS: dict[str, str] = {
    "gauge": "GAUGE",
    "trend": "TREND", "chart": "TREND", "graph": "TREND", "history": "TREND",
    "indicator": "STATUS_INDICATOR",
    "button": "BUTTON",
    "value": "VALUE_DISPLAY", "reading": "VALUE_DISPLAY", "number": "VALUE_DISPLAY",
    "alarms": "ALARM_INDICATOR", "alarmpanel": "ALARM_INDICATOR",
}


def _tokens(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def _content_tokens(text: str) -> set[str]:
    return {t for t in _tokens(text) if t not in STOPWORDS and not t.isdigit()}


def _tag_tokens(tag: Tag) -> set[str]:
    return {t for t in re.split(r"[^a-z0-9]+", tag.name.lower()) if t and not t.isdigit()}


def _best_matching_tag(clause_tokens: set[str], tags: list[Tag]) -> Tag | None:
    """Finds the existing tag whose name shares the most word tokens with the
    clause. Never returns anything not already present in `tags` -- this is
    the only way the planner is allowed to "pick" a tag."""
    best, best_overlap = None, 0
    for tag in tags:
        overlap = len(clause_tokens & _tag_tokens(tag))
        if overlap > best_overlap:
            best, best_overlap = tag, overlap
    return best


_ACRONYMS = {"Plc": "PLC"}


def _titleize(text: str) -> str:
    words = text.title().split(" ")
    return " ".join(_ACRONYMS.get(w, w) for w in words if w)


def _friendly_label(tag_name: str) -> str:
    """Strips a leading asset-instance segment like 'Motor_01' so
    'Motor_01_Speed' becomes 'Speed', otherwise title-cases the whole tag."""
    m = re.match(r"^(.*?_\d+)_(.+)$", tag_name)
    remainder = m.group(2) if m else tag_name
    return _titleize(remainder.replace("_", " "))


def _infer_object_type(clause_tokens: set[str], tag: Tag) -> str:
    for word, obj_type in EXPLICIT_TYPE_WORDS.items():
        if word in clause_tokens:
            return obj_type
    for token in _tag_tokens(tag):
        if token in ROLE_TYPE_HINTS:
            return ROLE_TYPE_HINTS[token]
    return "STATUS_INDICATOR" if tag.data_type == "BOOL" else "VALUE_DISPLAY"


def _split_clauses(requirement: str) -> list[str]:
    """Splits a requirement into independent intents. Sentences split on
    '.'/';'/newline first, then each sentence splits further on 'and'/commas
    -- except right after a comparison word (e.g. "above 80 and rising"),
    where the continuation is folded back into the alarm clause it belongs to."""
    rough = re.split(r"[.;!\n]+|\bthen\b", requirement, flags=re.IGNORECASE)
    clauses: list[str] = []
    for sentence in rough:
        sentence = sentence.strip()
        if not sentence:
            continue
        parts = [p.strip() for p in re.split(r"\band\b|\bwith\b|,", sentence, flags=re.IGNORECASE) if p.strip()]
        merged: list[str] = []
        for part in parts:
            prev_tokens = set(_tokens(merged[-1])) if merged else set()
            part_tokens = _tokens(part)
            looks_like_condition = bool(re.search(r"\d", part)) or bool(
                set(part_tokens) & set(COMPARISON_WORDS)
            )
            prev_is_alarm_clause = bool({"alarm", "alarms", "alert", "alerts"} & prev_tokens)
            prev_is_screen_clause = bool({"screen", "page"} & prev_tokens)
            if merged and prev_is_alarm_clause and not prev_is_screen_clause and looks_like_condition:
                merged[-1] = f"{merged[-1]} {part}"
            else:
                merged.append(part)
        clauses.extend(merged)
    return clauses or [requirement]


def _extract_new_screen_name(tokens: list[str], anchor: str) -> str:
    idx = tokens.index(anchor)
    # "<screen/page> called/named/titled <Name> [with ...]" -- name follows.
    if idx + 1 < len(tokens) and tokens[idx + 1] in ("called", "named", "titled"):
        following = tokens[idx + 2:]
        name_tokens: list[str] = []
        for t in following:
            if t in {"with", "that", "which", "showing", "having"} or len(name_tokens) >= 4:
                break
            name_tokens.append(t)
        return " ".join(name_tokens).title() if name_tokens else "New Screen"

    # otherwise "<Name> screen/page" -- name precedes.
    preceding = [t for t in tokens[:idx] if t not in STOPWORDS]
    candidate_tokens = preceding[-3:] if len(preceding) >= 2 else preceding
    return " ".join(candidate_tokens).title() if candidate_tokens else "New Screen"


def _resolve_target_screen(requirement: str, project: Project) -> tuple[str, str, bool]:
    """Returns (screen_id, screen_name, needs_create)."""
    tokens = _tokens(requirement)
    has_screen_word = "screen" in tokens or "page" in tokens

    # 1) Explicit "a/the new screen ..." intent always wins, even if the new
    # screen's name happens to overlap with an existing screen's name.
    if "new" in tokens and has_screen_word:
        anchor = "screen" if "screen" in tokens else "page"
        screen_name = _extract_new_screen_name(tokens, anchor)
        return slugify(screen_name), screen_name, True

    # 2) Does the requirement reference an EXISTING screen by name/id?
    for screen in project.screens:
        name_tokens = set(_tokens(screen.name)) | {screen.id}
        if name_tokens & set(tokens):
            return screen.id, screen.name, False

    # 3) Does it ask to create a new screen some other way ("<words> screen")?
    if has_screen_word:
        anchor = "screen" if "screen" in tokens else "page"
        screen_name = _extract_new_screen_name(tokens, anchor)
        return slugify(screen_name), screen_name, True

    # 4) No screen mentioned at all -- default to the dashboard hub so the
    # plan still does something useful instead of failing outright.
    dashboard = project.get_screen("dashboard")
    if dashboard:
        return dashboard.id, dashboard.name, False
    first = project.screens[0]
    return first.id, first.name, False


def _mock_plan(requirement: str, project: Project) -> EngineeringPlan:
    """Deterministic rule-based planner used when no LLM API key is configured.
    Grounds every action in the actual project graph -- it can match any
    existing tag by its word tokens, not just a fixed keyword list."""
    screen_id, screen_name, needs_create = _resolve_target_screen(requirement, project)
    clauses = _split_clauses(requirement)

    actions: list[dict] = []
    unknowns: list[str] = []
    added_tags: set[str] = set()

    if needs_create:
        actions.append({"action": "CREATE_SCREEN", "screen": screen_name})

    existing_screen_names = {s.id for s in project.screens} | {s.name.lower() for s in project.screens}

    for clause in clauses:
        clause_lower = clause.lower()
        raw_tokens = set(_tokens(clause))
        mentions_screen_word = bool({"screen", "page"} & raw_tokens)
        clause_tokens = _content_tokens(clause)
        # Drop tokens that only describe the screen itself so they don't
        # accidentally "match" a tag (e.g. the word "overview").
        clause_tokens -= {"overview", "screen", "page", "view", "navigation", "nav", "menu",
                           "accessible", "main"}

        is_alarm_intent = bool({"alarm", "alarms", "alert", "alerts"} & raw_tokens)
        is_alarm_summary_widget = is_alarm_intent and clause_tokens & {
            "indicator", "panel", "summary", "list", "widget", "banner",
        }
        has_alarm_condition_signal = bool(re.search(r"\d", clause)) or bool(raw_tokens & set(COMPARISON_WORDS))
        if is_alarm_intent and mentions_screen_word and not is_alarm_summary_widget and not has_alarm_condition_signal:
            # e.g. "a screen called Alarms Overview" -- "alarms" here just
            # names the screen, it isn't a request to create an alarm.
            is_alarm_intent = False

        if is_alarm_summary_widget:
            # "alarm indicator/panel/summary" describes a UI widget that
            # lists whatever alarms are active -- it has no single tag of
            # its own (matches the demo project's own Alarms screen object).
            obj_id_key = f"__alarm_indicator__{screen_name}"
            if obj_id_key in added_tags:
                continue
            added_tags.add(obj_id_key)
            actions.append({
                "action": "ADD_OBJECT", "screen": screen_name, "object_type": "ALARM_INDICATOR",
                "tag": None, "label": "Active Alarms",
            })
            continue

        if is_alarm_intent:
            tag_tokens = clause_tokens - ALARM_STRUCTURAL_WORDS
            tag = _best_matching_tag(tag_tokens, project.tags)
            if not tag:
                unknowns.append(f"Alarm requested ('{clause.strip()}') but no matching existing tag was found")
                continue

            condition = "GT"
            for word, cond in COMPARISON_WORDS.items():
                if word in clause_tokens:
                    condition = cond
                    break

            severity = "MEDIUM"
            for word, sev in SEVERITY_WORDS.items():
                if word in clause_tokens:
                    severity = sev
                    break

            number_match = re.search(r"(\d+(?:\.\d+)?)", clause)
            threshold: float | None = float(number_match.group(1)) if number_match else None

            if tag.data_type == "BOOL":
                condition = "EQ"
                threshold = 0.0 if any(
                    w in clause_tokens for w in {"loss", "lost", "down", "fail", "failure", "disconnect", "offline"}
                ) else 1.0
            elif threshold is None:
                # Never invent a numeric threshold. One narrow, transparent
                # exception: the canonical "high <role>" phrasing with no
                # number gets a clearly-labeled inferred default so the plan
                # is still useful; everything else is reported as unknown.
                if "high" in clause_tokens:
                    threshold = 80.0
                    unknowns.append(
                        f"No numeric threshold was given for the '{tag.name}' alarm; inferred {threshold} "
                        f"as a typical 'high' threshold -- engineer should confirm."
                    )
                else:
                    unknowns.append(f"Alarm on '{tag.name}' requested but no threshold was specified")
                    continue

            name_tokens = [
                t for t in _tokens(clause)
                if t not in ALARM_STRUCTURAL_WORDS and t not in STOPWORDS and not t.isdigit()
                and t not in {"alarm", "alarms", "alert", "alerts"}
            ]
            alarm_name = _titleize(" ".join(name_tokens)) if name_tokens else f"{_friendly_label(tag.name)} Alarm"

            actions.append({
                "action": "CREATE_ALARM", "alarm": alarm_name, "tag": tag.name,
                "threshold": threshold, "condition": condition, "severity": severity,
            })
            continue

        if raw_tokens & {"navigation", "accessible", "nav", "menu"} and needs_create:
            actions.append({"action": "ADD_NAVIGATION", "from_screen": "dashboard", "to_screen": screen_id})
            continue

        if not clause_tokens:
            continue

        tag = _best_matching_tag(clause_tokens, project.tags)
        if tag:
            if tag.name in added_tags:
                continue
            added_tags.add(tag.name)
            obj_type = _infer_object_type(clause_tokens, tag)
            actions.append({
                "action": "ADD_OBJECT", "screen": screen_name, "object_type": obj_type,
                "tag": tag.name, "label": _friendly_label(tag.name),
            })
        elif clause_tokens - existing_screen_names and not mentions_screen_word:
            # Only flag as unknown if this clause looks like it was trying to
            # describe something concrete (not just filler like "and make it
            # look nice", and not the "create a <name> screen" preamble
            # already consumed by _resolve_target_screen above).
            meaningful = clause_tokens - {"it", "look", "nice", "clean", "simple", "please"}
            if meaningful:
                unknowns.append(f"No existing tag found matching: '{clause.strip()}'")

    return EngineeringPlan(
        summary=f"Generated plan for requirement: '{requirement.strip()}'",
        actions=actions,
        unknowns=unknowns,
    )


def _extract_json(text: str) -> dict:
    text = text.strip()
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m:
        raise ValueError("No JSON object found in LLM response")
    return json.loads(m.group(0))


def generate_plan(requirement: str, project: Project) -> EngineeringPlan:
    if llm_client.mock_mode:
        return _mock_plan(requirement, project)

    graph = ProjectGraph(build_graph(project))
    context = graph.compact_context()
    user_prompt = (
        f"Requirement: {requirement}\n\n"
        f"Available tags: {context.get('Tag', [])}\n"
        f"Available screens: {context.get('Screen', [])}\n"
    )

    last_error = None
    for attempt in range(2):
        try:
            raw = llm_client.complete_json(SYSTEM_PROMPT, user_prompt)
            data = _extract_json(raw)
            return EngineeringPlan.model_validate(data)
        except (ValidationError, ValueError, json.JSONDecodeError) as e:
            last_error = e
            user_prompt += f"\n\nYour previous response was invalid: {e}. Return corrected JSON only."
    raise RuntimeError(f"LLM failed to produce a valid EngineeringPlan after retry: {last_error}")
