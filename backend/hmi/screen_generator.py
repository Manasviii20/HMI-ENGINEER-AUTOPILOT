from backend.models.project import Project, Screen


def create_screen(project: Project, screen_id: str, name: str) -> Screen:
    existing = project.get_screen(screen_id)
    if existing:
        return existing
    screen = Screen(id=screen_id, name=name)
    project.screens.append(screen)
    return screen


def slugify(name: str) -> str:
    return "_".join(name.strip().lower().split())
