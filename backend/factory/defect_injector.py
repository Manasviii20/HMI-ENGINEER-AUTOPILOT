"""Deterministic, seeded defect injection for the Synthetic Engineering Data
Factory. Every defect type here maps 1:1 to an issue type the REAL
structural validator (backend/validation/structural.py) actually detects --
nothing is injected that the validator can't genuinely catch, so factory
stats are never inflated.
"""
import random
from backend.models.project import Project

DEFECT_TYPES = ["MISSING_BINDING", "INVALID_TAG", "BROKEN_NAVIGATION", "INVALID_ALARM_TAG", "NO_NAVIGATION_PATH"]


def _tag_bound_objects(project: Project):
    return [(s, o) for s in project.screens for o in s.objects if o.tag and o.object_type in
            ("VALUE_DISPLAY", "GAUGE", "TREND")]


def inject_defect(project: Project, defect_type: str, rng: random.Random) -> dict | None:
    """Mutates `project` in place to introduce one defect. Returns a
    description dict, or None if this defect type doesn't apply (e.g. no
    tag-bound object exists to break)."""
    if defect_type == "MISSING_BINDING":
        candidates = _tag_bound_objects(project)
        if not candidates:
            return None
        _, obj = rng.choice(candidates)
        original_tag = obj.tag
        obj.tag = None
        return {"type": defect_type, "detail": f"Removed binding on '{obj.id}' (was '{original_tag}')"}

    if defect_type == "INVALID_TAG":
        candidates = _tag_bound_objects(project)
        if not candidates:
            return None
        _, obj = rng.choice(candidates)
        original_tag = obj.tag
        obj.tag = f"{original_tag}_NONEXISTENT"
        return {"type": defect_type, "detail": f"Object '{obj.id}' now points at nonexistent tag '{obj.tag}'"}

    if defect_type == "INVALID_ALARM_TAG":
        if not project.alarms:
            return None
        alarm = rng.choice(project.alarms)
        original_tag = alarm.tag
        alarm.tag = f"{original_tag}_MISSING"
        return {"type": defect_type, "detail": f"Alarm '{alarm.name}' now references nonexistent tag '{alarm.tag}'"}

    if defect_type == "BROKEN_NAVIGATION":
        if not project.navigation:
            return None
        nav = rng.choice(project.navigation)
        original = nav.to_screen
        nav.to_screen = f"{original}_missing"
        return {"type": defect_type, "detail": f"Navigation from '{nav.from_screen}' now targets missing screen '{nav.to_screen}'"}

    if defect_type == "NO_NAVIGATION_PATH":
        non_dashboard = [s for s in project.screens if s.id != "dashboard"]
        if not non_dashboard:
            return None
        screen = rng.choice(non_dashboard)
        before = len(project.navigation)
        project.navigation = [n for n in project.navigation if screen.id not in (n.from_screen, n.to_screen)]
        if len(project.navigation) == before:
            return None
        return {"type": defect_type, "detail": f"Removed all navigation links to/from screen '{screen.id}'"}

    return None


def inject_random_defects(project: Project, rng: random.Random, max_defects: int = 2) -> list[dict]:
    """Injects between 0 and max_defects defects, each a different type,
    chosen deterministically from the given rng (seeded by the caller)."""
    count = rng.randint(0, max_defects)
    if count == 0:
        return []
    chosen_types = rng.sample(DEFECT_TYPES, k=min(count, len(DEFECT_TYPES)))
    injected = []
    for defect_type in chosen_types:
        result = inject_defect(project, defect_type, rng)
        if result:
            injected.append(result)
    return injected
