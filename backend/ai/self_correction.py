"""Self-correction: detect -> classify -> explain -> propose fix -> validate -> apply -> re-test.

Correction proposals are produced by a deterministic rule-based mock (or the
LLM, when configured) but are ALWAYS re-validated against actual project data
before being applied. Max 3 correction cycles to prevent infinite loops.
"""
import re

from backend.models.project import Project
from backend.models.engineering import CorrectionPlan, CorrectionAction
from backend.hmi.project_generator import apply_correction
from backend.validation.validator import run_full_validation

MAX_CYCLES = 3


def _tokens(text: str) -> set[str]:
    """Splits a label or tag name into lowercase word tokens, so 'Motor Speed
    Trend' and 'Motor_01_Speed' both yield overlapping tokens like 'motor'
    and 'speed' regardless of separator (space, underscore, digits)."""
    return {t for t in re.split(r"[^a-z0-9]+", text.lower()) if t and not t.isdigit()}


def _best_matching_tag(project: Project, obj) -> str | None:
    """Grounded, deterministic role match: picks the existing tag whose name
    shares the most word tokens with the object's label. Never invents a tag
    -- only ever returns a tag that already exists in the project."""
    role_tokens = _tokens(obj.label or "")
    if not role_tokens:
        return None
    best_tag = None
    best_overlap = 0
    for tag in project.tags:
        overlap = len(role_tokens & _tokens(tag.name))
        if overlap > best_overlap:
            best_overlap = overlap
            best_tag = tag.name
    return best_tag


def _propose_correction(project: Project, issue: dict) -> CorrectionPlan | None:
    """Deterministic correction proposal, grounded in existing project data."""
    if issue["type"] == "MISSING_BINDING":
        object_id = issue["object"]
        obj = None
        for s in project.screens:
            for o in s.objects:
                if o.id == object_id:
                    obj = o
        if not obj:
            return None
        candidate = _best_matching_tag(project, obj)
        if not candidate:
            return None
        return CorrectionPlan(
            issue_id=issue["id"],
            actions=[CorrectionAction(
                action="ADD_BINDING", object=object_id, tag=candidate,
                reason=f"Existing tag '{candidate}' matches the object's semantic role "
                       f"('{obj.label}') and already exists in the project.",
            )],
        )

    if issue["type"] == "NO_NAVIGATION_PATH":
        return CorrectionPlan(
            issue_id=issue["id"],
            actions=[CorrectionAction(
                action="ADD_NAVIGATION", screen=issue["screen"],
                reason=f"Screen '{issue['screen']}' has no navigation path; linking it to the Dashboard hub.",
            )],
        )

    return None


def run_self_correction(project: Project) -> dict:
    cycles = []
    for cycle_num in range(1, MAX_CYCLES + 1):
        result = run_full_validation(project)
        if result["status"] == "PASS":
            cycles.append({"cycle": cycle_num, "status": "PASS", "actions": []})
            break

        cycle_log = {"cycle": cycle_num, "status": "CORRECTING", "actions": []}
        any_applied = False
        for issue in result["structural_issues"]:
            plan = _propose_correction(project, issue)
            if plan is None:
                cycle_log["actions"].append({
                    "issue": issue["id"], "status": "REQUIRES_ENGINEER_INPUT",
                    "reason": "No grounded correction could be determined automatically",
                })
                continue
            applied = apply_correction(project, plan)
            cycle_log["actions"].extend(applied)
            if any(a["status"] == "APPLIED" for a in applied):
                any_applied = True
        cycles.append(cycle_log)
        if not any_applied:
            break

    final_validation = run_full_validation(project)
    return {
        "cycles": cycles,
        "final_status": final_validation["status"],
        "final_validation": final_validation,
    }
