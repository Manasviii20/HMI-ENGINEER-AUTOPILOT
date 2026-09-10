"""Structural validation: tags, objects, screens, navigation, bindings, alarms."""
from backend.models.project import Project

OBJECTS_REQUIRING_TAG = {"VALUE_DISPLAY", "GAUGE", "TREND"}


def validate_structural(project: Project) -> list[dict]:
    issues: list[dict] = []
    tag_names = {t.name for t in project.tags}
    screen_ids = {s.id for s in project.screens}

    for screen in project.screens:
        for obj in screen.objects:
            if obj.object_type in OBJECTS_REQUIRING_TAG:
                if not obj.tag:
                    issues.append({
                        "id": f"MISSING_BINDING::{obj.id}",
                        "type": "MISSING_BINDING",
                        "severity": "HIGH",
                        "screen": screen.id,
                        "object": obj.id,
                        "message": f"Object '{obj.id}' ({obj.object_type}) on screen '{screen.id}' has no tag binding",
                    })
                elif obj.tag not in tag_names:
                    issues.append({
                        "id": f"INVALID_TAG::{obj.id}",
                        "type": "INVALID_TAG",
                        "severity": "HIGH",
                        "screen": screen.id,
                        "object": obj.id,
                        "message": f"Object '{obj.id}' binds to unknown tag '{obj.tag}'",
                    })

    for alarm in project.alarms:
        if alarm.tag not in tag_names:
            issues.append({
                "id": f"INVALID_ALARM_TAG::{alarm.id}",
                "type": "INVALID_ALARM_TAG",
                "severity": "HIGH",
                "message": f"Alarm '{alarm.name}' references unknown tag '{alarm.tag}'",
            })

    for nav in project.navigation:
        if nav.to_screen not in screen_ids:
            issues.append({
                "id": f"BROKEN_NAV::{nav.from_screen}->{nav.to_screen}",
                "type": "BROKEN_NAVIGATION",
                "severity": "MEDIUM",
                "message": f"Navigation from '{nav.from_screen}' targets missing screen '{nav.to_screen}'",
            })
        if nav.from_screen not in screen_ids:
            issues.append({
                "id": f"BROKEN_NAV_SRC::{nav.from_screen}->{nav.to_screen}",
                "type": "BROKEN_NAVIGATION",
                "severity": "MEDIUM",
                "message": f"Navigation source screen '{nav.from_screen}' does not exist",
            })

    nav_sources = {n.from_screen for n in project.navigation}
    nav_targets = {n.to_screen for n in project.navigation}
    for screen in project.screens:
        if screen.id == "dashboard":
            continue
        if screen.id not in nav_sources and screen.id not in nav_targets:
            issues.append({
                "id": f"NO_NAV_PATH::{screen.id}",
                "type": "NO_NAVIGATION_PATH",
                "severity": "MEDIUM",
                "screen": screen.id,
                "message": f"Screen '{screen.id}' has no navigation path to/from it",
            })

    return issues
