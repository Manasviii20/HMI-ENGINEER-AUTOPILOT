"""Deterministic executor for EngineeringPlan / CorrectionPlan objects.

The LLM never touches the project directly. Every action here is validated
against the actual project state before being applied; anything that cannot
be grounded in existing data is rejected (never invented).
"""
from backend.models.project import Project
from backend.models.engineering import EngineeringPlan, EngineeringAction, CorrectionPlan
from backend.hmi.screen_generator import create_screen, slugify
from backend.hmi.object_generator import add_object
from backend.hmi.alarm_manager import create_alarm
from backend.hmi.navigation_manager import add_navigation
from backend.hmi.tag_manager import tag_exists


class PlanExecutionError(Exception):
    pass


def _new_object_id(project: Project, screen_id: str, object_type: str) -> str:
    base = f"obj_{screen_id}_{object_type.lower()}"
    idx = 1
    existing_ids = {o.id for s in project.screens for o in s.objects}
    candidate = base
    while candidate in existing_ids:
        idx += 1
        candidate = f"{base}_{idx}"
    return candidate


def apply_action(project: Project, action: EngineeringAction) -> dict:
    """Applies one validated action. Returns a log entry."""
    if action.action == "CREATE_SCREEN":
        if not action.screen:
            raise PlanExecutionError("CREATE_SCREEN requires 'screen'")
        screen_id = slugify(action.screen)
        create_screen(project, screen_id, action.screen)
        add_navigation(project, "dashboard", screen_id, label=action.screen)
        return {"action": "CREATE_SCREEN", "screen_id": screen_id, "status": "APPLIED"}

    if action.action == "ADD_OBJECT":
        if not action.screen or not action.object_type:
            raise PlanExecutionError("ADD_OBJECT requires 'screen' and 'object_type'")
        screen_id = slugify(action.screen)
        if action.tag and not tag_exists(project, action.tag):
            raise PlanExecutionError(f"Tag '{action.tag}' does not exist; refusing to invent it")
        object_id = _new_object_id(project, screen_id, action.object_type)
        add_object(project, screen_id, object_id, action.object_type, tag=action.tag, label=action.label)
        return {"action": "ADD_OBJECT", "object_id": object_id, "status": "APPLIED"}

    if action.action == "CREATE_ALARM":
        if not action.alarm or not action.tag or action.threshold is None:
            raise PlanExecutionError("CREATE_ALARM requires 'alarm', 'tag', 'threshold'")
        if not tag_exists(project, action.tag):
            raise PlanExecutionError(f"Tag '{action.tag}' does not exist; refusing to invent it")
        alarm_id = f"alm_{slugify(action.alarm)}"
        create_alarm(project, alarm_id, action.alarm, action.tag, action.threshold,
                     condition=action.condition or "GT", severity=action.severity or "MEDIUM")
        return {"action": "CREATE_ALARM", "alarm_id": alarm_id, "status": "APPLIED"}

    if action.action == "ADD_NAVIGATION":
        if not action.from_screen or not action.to_screen:
            raise PlanExecutionError("ADD_NAVIGATION requires 'from_screen' and 'to_screen'")
        add_navigation(project, slugify(action.from_screen), slugify(action.to_screen))
        return {"action": "ADD_NAVIGATION", "status": "APPLIED"}

    if action.action == "ADD_BINDING":
        if not action.object_id or not action.tag:
            raise PlanExecutionError("ADD_BINDING requires 'object_id' and 'tag'")
        if not tag_exists(project, action.tag):
            raise PlanExecutionError(f"Tag '{action.tag}' does not exist; refusing to invent it")
        obj = None
        for s in project.screens:
            for o in s.objects:
                if o.id == action.object_id:
                    obj = o
        if not obj:
            raise PlanExecutionError(f"Object '{action.object_id}' not found")
        obj.tag = action.tag
        return {"action": "ADD_BINDING", "object_id": obj.id, "tag": action.tag, "status": "APPLIED"}

    raise PlanExecutionError(f"Unsupported action type: {action.action}")


def apply_plan(project: Project, plan: EngineeringPlan) -> list[dict]:
    log = []
    for action in plan.actions:
        try:
            log.append(apply_action(project, action))
        except PlanExecutionError as e:
            log.append({"action": action.action, "status": "REJECTED", "reason": str(e)})
    return log


def apply_correction(project: Project, plan: CorrectionPlan) -> list[dict]:
    log = []
    for corr in plan.actions:
        try:
            if corr.action == "ADD_BINDING":
                if not corr.object or not corr.tag:
                    raise PlanExecutionError("ADD_BINDING correction requires object and tag")
                if not tag_exists(project, corr.tag):
                    raise PlanExecutionError(f"Tag '{corr.tag}' does not exist")
                obj = None
                for s in project.screens:
                    for o in s.objects:
                        if o.id == corr.object:
                            obj = o
                if not obj:
                    raise PlanExecutionError(f"Object '{corr.object}' not found")
                obj.tag = corr.tag
                log.append({"action": "ADD_BINDING", "object": corr.object, "tag": corr.tag,
                            "status": "APPLIED", "reason": corr.reason})
            elif corr.action == "ADD_NAVIGATION":
                if not corr.screen:
                    raise PlanExecutionError("ADD_NAVIGATION correction requires screen")
                add_navigation(project, "dashboard", corr.screen)
                log.append({"action": "ADD_NAVIGATION", "screen": corr.screen, "status": "APPLIED",
                            "reason": corr.reason})
            else:
                log.append({"action": corr.action, "status": "SKIPPED",
                            "reason": "No deterministic handler for this correction type"})
        except PlanExecutionError as e:
            log.append({"action": corr.action, "status": "REJECTED", "reason": str(e)})
    return log
