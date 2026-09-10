from backend.models.project import Project, NavigationLink


def link_exists(project: Project, from_screen: str, to_screen: str) -> bool:
    return any(n.from_screen == from_screen and n.to_screen == to_screen for n in project.navigation)


def add_navigation(project: Project, from_screen: str, to_screen: str, label: str | None = None,
                    bidirectional: bool = True) -> None:
    if not project.get_screen(from_screen) or not project.get_screen(to_screen):
        raise ValueError("Both screens must exist to add navigation")
    if not link_exists(project, from_screen, to_screen):
        project.navigation.append(NavigationLink(from_screen=from_screen, to_screen=to_screen, label=label))
    if bidirectional and not link_exists(project, to_screen, from_screen):
        back_label = project.get_screen(from_screen).name
        project.navigation.append(NavigationLink(from_screen=to_screen, to_screen=from_screen, label=back_label))
