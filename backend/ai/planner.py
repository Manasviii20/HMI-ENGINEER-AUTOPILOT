"""Requirement Analyzer + Engineering Planner.

Converts a free-text engineering requirement into a structured EngineeringPlan,
grounded ONLY in tags/screens/assets that actually exist in the project graph.
Uses the LLM when configured; otherwise falls back to a deterministic mock
planner that demonstrates the same workflow without an API key.
"""
import json
import re
from pydantic import ValidationError

from backend.models.project import Project
from backend.models.engineering import EngineeringPlan
from backend.graph.project_graph import ProjectGraph
from backend.ai.llm_client import llm_client
from backend.hmi.screen_generator import slugify
from backend.graph.graph_builder import build_graph

ROLE_KEYWORDS = {
    "speed": ("GAUGE", "Speed"),
    "temperature": ("VALUE_DISPLAY", "Temperature"),
    "overload": ("STATUS_INDICATOR", "Overload"),
    "run": ("STATUS_INDICATOR", "Run"),
    "status": ("STATUS_INDICATOR", "Status"),
}

SYSTEM_PROMPT = (
    "You are an HMI engineering planner. You convert a requirement into a JSON "
    "EngineeringPlan. You may ONLY reference tags and screens given in the context. "
    "NEVER invent tag names, screen ids, or engineering facts. If information is "
    "missing, add it to 'unknowns' instead of guessing. Respond with JSON only, "
    "matching this schema: {\"summary\": str, \"actions\": [ {\"action\": "
    "\"CREATE_SCREEN|ADD_OBJECT|CREATE_ALARM|ADD_NAVIGATION\", ...fields}], "
    "\"unknowns\": [str]}."
)


def _mock_plan(requirement: str, project: Project) -> EngineeringPlan:
    """Deterministic keyword-based planner used when no LLM API key is configured."""
    req = requirement.lower()
    existing_tags = {t.name for t in project.tags}

    stopwords = {"a", "an", "the", "add", "new", "create", "make", "some", "is", "of"}
    tokens = re.findall(r"[a-z0-9]+", req)
    screen_name = "Motor Overview"
    if "screen" in tokens:
        idx = tokens.index("screen")
        preceding = [t for t in tokens[:idx] if t not in stopwords]
        candidate_tokens = preceding[-3:] if len(preceding) >= 2 else preceding
        if candidate_tokens:
            screen_name = " ".join(candidate_tokens).title()
    screen_id = slugify(screen_name)

    actions = [{"action": "CREATE_SCREEN", "screen": screen_name}]
    unknowns = []

    for role, (obj_type, label) in ROLE_KEYWORDS.items():
        if role in req:
            tag_name = next((t for t in existing_tags if role in t.lower()), None)
            if tag_name:
                actions.append({
                    "action": "ADD_OBJECT", "screen": screen_name,
                    "object_type": obj_type, "tag": tag_name, "label": label,
                })
            else:
                unknowns.append(f"No existing tag found for requested role '{role}'")

    if "alarm" in req:
        threshold_match = re.search(r"(\d+(?:\.\d+)?)", req)
        threshold = float(threshold_match.group(1)) if threshold_match else 80.0
        temp_tag = next((t for t in existing_tags if "temperature" in t.lower()), None)
        if "temperature" in req and temp_tag:
            actions.append({
                "action": "CREATE_ALARM", "alarm": "High Temperature",
                "tag": temp_tag, "threshold": threshold, "condition": "GT", "severity": "HIGH",
            })
        elif "temperature" in req:
            unknowns.append("Requested temperature alarm but no temperature tag exists")

    if "navigation" in req or "accessible" in req or "nav" in req:
        actions.append({"action": "ADD_NAVIGATION", "from_screen": "dashboard", "to_screen": screen_id})

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
