"""Deterministic script generator.

IMPORTANT (see README limitations): Schneider EOTE's actual scripting
language, object model, and runtime are proprietary and were not available
to this project -- no spec, SDK, or sample script was provided to verify
against. Generating real EOTE script syntax is therefore explicitly out of
scope; doing so would be fabricating a "fact" this project cannot verify.

Instead, this generates readable pseudo-code in the IEC 61131-3
"Structured Text" style -- a real, publicly documented, vendor-neutral
industrial automation standard -- grounded only in tags/objects/alarms that
actually exist in the parsed project. Every generated script is labeled
NEUTRAL / UNVERIFIED against any specific vendor runtime.
"""
from backend.models.project import Project, Screen, HmiObject, Alarm

LANGUAGE_LABEL = "IEC 61131-3 Structured-Text style (neutral, NOT verified against Schneider EOTE's proprietary scripting runtime)"


def _header(title: str) -> str:
    return (
        f"(* {title}\n"
        f"   Generated in neutral structured-text style for demonstration.\n"
        f"   NOT verified against any vendor's proprietary scripting runtime. *)\n"
    )


def generate_object_script(obj: HmiObject) -> str:
    if not obj.tag:
        return _header(f"Object '{obj.id}' has no tag binding") + "(* Nothing to generate: bind a tag first. *)\n"

    lines = [_header(f"Event script for object '{obj.id}' ({obj.object_type})")]
    if obj.object_type == "BUTTON":
        lines.append(f"ON_CLICK({obj.id}):")
        lines.append(f"    {obj.tag} := NOT {obj.tag};  (* toggle bound BOOL tag *)")
        lines.append("END_ON_CLICK")
    elif obj.object_type in ("GAUGE", "VALUE_DISPLAY", "TREND"):
        lines.append(f"ON_TAG_CHANGE({obj.tag}):")
        lines.append(f"    {obj.id}.Value := {obj.tag};  (* refresh displayed value *)")
        lines.append("END_ON_TAG_CHANGE")
    elif obj.object_type == "STATUS_INDICATOR":
        lines.append(f"ON_TAG_CHANGE({obj.tag}):")
        lines.append(f"    IF {obj.tag} THEN")
        lines.append(f"        {obj.id}.Color := COLOR_GREEN;")
        lines.append("    ELSE")
        lines.append(f"        {obj.id}.Color := COLOR_GRAY;")
        lines.append("    END_IF")
        lines.append("END_ON_TAG_CHANGE")
    else:
        lines.append(f"(* No standard event template for object type '{obj.object_type}'. *)")
    return "\n".join(lines) + "\n"


def generate_alarm_script(alarm: Alarm) -> str:
    op = {"GT": ">", "LT": "<", "EQ": "=", "NEQ": "<>"}[alarm.condition]
    lines = [_header(f"Alarm check for '{alarm.name}'")]
    lines.append(f"ON_SCAN_CYCLE:")
    lines.append(f"    IF {alarm.tag} {op} {alarm.threshold} THEN")
    lines.append(f"        RAISE_ALARM('{alarm.name}', SEVERITY_{alarm.severity});")
    lines.append("    ELSE")
    lines.append(f"        CLEAR_ALARM('{alarm.name}');")
    lines.append("    END_IF")
    lines.append("END_ON_SCAN_CYCLE")
    return "\n".join(lines) + "\n"


def generate_screen_script(screen: Screen) -> str:
    parts = [_header(f"Event scripts for screen '{screen.name}' ({len(screen.objects)} object(s))")]
    if not screen.objects:
        parts.append("(* This screen has no objects to generate scripts for. *)\n")
        return "".join(parts)
    for obj in screen.objects:
        parts.append(generate_object_script(obj))
    return "\n".join(parts)


def generate_script(project: Project, target_type: str, target_id: str) -> dict:
    """target_type: 'object' | 'alarm' | 'screen'. Returns {language, code} or
    raises ValueError if target_id doesn't exist (never invents a target)."""
    if target_type == "object":
        for screen in project.screens:
            for obj in screen.objects:
                if obj.id == target_id:
                    return {"language": LANGUAGE_LABEL, "code": generate_object_script(obj)}
        raise ValueError(f"Object '{target_id}' not found in project")

    if target_type == "alarm":
        alarm = next((a for a in project.alarms if a.id == target_id), None)
        if not alarm:
            raise ValueError(f"Alarm '{target_id}' not found in project")
        return {"language": LANGUAGE_LABEL, "code": generate_alarm_script(alarm)}

    if target_type == "screen":
        screen = project.get_screen(target_id)
        if not screen:
            raise ValueError(f"Screen '{target_id}' not found in project")
        return {"language": LANGUAGE_LABEL, "code": generate_screen_script(screen)}

    raise ValueError(f"Unknown target_type '{target_type}'")
