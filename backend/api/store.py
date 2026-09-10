"""In-memory project store for the hackathon MVP (no database needed)."""
from pathlib import Path
from backend.models.project import Project
from backend.parser.project_parser import parse_project_file

DEMO_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "demo_project.json"

_STORE: dict[str, Project] = {}
_APPROVED: dict[str, bool] = {}


def load_demo() -> Project:
    project = parse_project_file(DEMO_PATH)
    _STORE["demo"] = project
    _APPROVED["demo"] = False
    return project


def get_project(project_id: str) -> Project:
    if project_id not in _STORE:
        if project_id == "demo":
            return load_demo()
        raise KeyError(f"Unknown project_id '{project_id}'")
    return _STORE[project_id]


def set_project(project_id: str, project: Project) -> None:
    _STORE[project_id] = project


def approve(project_id: str) -> None:
    _APPROVED[project_id] = True


def is_approved(project_id: str) -> bool:
    return _APPROVED.get(project_id, False)
