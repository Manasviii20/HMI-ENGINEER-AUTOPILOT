"""Deterministic parser for the neutral HMI project JSON representation."""
import json
from pathlib import Path
from backend.models.project import Project


def parse_project_file(path: str | Path) -> Project:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return Project.model_validate(data)


def parse_project_dict(data: dict) -> Project:
    return Project.model_validate(data)


def summarize(project: Project) -> dict:
    """Deterministic structural summary used by the UI 'parse' step."""
    return {
        "project_name": project.project.name,
        "tag_count": len(project.tags),
        "screen_count": len(project.screens),
        "object_count": sum(len(s.objects) for s in project.screens),
        "alarm_count": len(project.alarms),
        "navigation_count": len(project.navigation),
        "dependency_count": len(project.dependencies),
        "tags": [t.name for t in project.tags],
        "screens": [s.id for s in project.screens],
        "alarms": [a.name for a in project.alarms],
    }
