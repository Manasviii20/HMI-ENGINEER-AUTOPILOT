from backend.models.project import Project, Alarm


def create_alarm(project: Project, alarm_id: str, name: str, tag: str, threshold: float,
                  condition: str = "GT", severity: str = "MEDIUM") -> Alarm:
    if not project.get_tag(tag):
        raise ValueError(f"Cannot create alarm '{name}': tag '{tag}' does not exist")
    if any(a.id == alarm_id for a in project.alarms):
        raise ValueError(f"Alarm id '{alarm_id}' already exists")
    alarm = Alarm(id=alarm_id, name=name, tag=tag, condition=condition,
                  threshold=threshold, severity=severity)
    project.alarms.append(alarm)
    return alarm
