from backend.models.project import Project, Screen, HmiObject, Dependency

_LAYOUT_COLS = 3
_CARD_W, _CARD_H, _GAP = 180, 120, 20


def _next_position(screen: Screen) -> tuple[int, int]:
    idx = len(screen.objects)
    col = idx % _LAYOUT_COLS
    row = idx // _LAYOUT_COLS
    x = 20 + col * (_CARD_W + _GAP)
    y = 20 + row * (_CARD_H + _GAP)
    return x, y


def add_object(project: Project, screen_id: str, object_id: str, object_type: str,
                tag: str | None = None, label: str | None = None) -> HmiObject:
    screen = project.get_screen(screen_id)
    if not screen:
        raise ValueError(f"Screen '{screen_id}' does not exist")
    if any(o.id == object_id for o in screen.objects):
        raise ValueError(f"Object id '{object_id}' already exists on screen '{screen_id}'")
    x, y = _next_position(screen)
    obj = HmiObject(id=object_id, object_type=object_type, tag=tag, label=label,
                     x=x, y=y, width=_CARD_W, height=_CARD_H)
    screen.objects.append(obj)
    if tag:
        project.dependencies.append(Dependency(source=object_id, target=tag, relation="BINDS_TO"))
    return obj
