from backend.models.project import Project


def tag_exists(project: Project, tag_name: str) -> bool:
    return project.get_tag(tag_name) is not None


def resolve_tag_or_unknown(project: Project, tag_name: str | None) -> str:
    """Never invent a tag. Returns the tag name if it exists, else UNKNOWN."""
    if tag_name and tag_exists(project, tag_name):
        return tag_name
    return "UNKNOWN"
