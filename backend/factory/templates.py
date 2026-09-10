"""Machine-type templates for the Synthetic Engineering Data Factory.

Each template is a small, hand-authored, REAL, valid instance of the same
neutral Project schema used everywhere else in this app (backend/models).
This is deterministic structured engineering data, not a trained model and
not scraped/fabricated data -- every field is a genuine, internally
consistent HMI engineering project (tags -> objects -> screens -> alarms ->
navigation), sized to match what real conveyor/packaging/pump/tank/filling
skids look like at a single-machine scope.
"""
from backend.models.project import Project, ProjectMeta, Tag, Screen, HmiObject, Alarm, NavigationLink, Dependency


def _dashboard_and_alarms_screens(prefix: str, status_tags: list[tuple[str, str]]) -> list[Screen]:
    """status_tags: list of (tag_name, label) for STATUS_INDICATOR objects on the dashboard."""
    dash_objs = [
        HmiObject(id=f"obj_{prefix}_{i}_status", object_type="STATUS_INDICATOR", tag=tag, label=label)
        for i, (tag, label) in enumerate(status_tags)
    ]
    return [
        Screen(id="dashboard", name="Dashboard", objects=dash_objs),
        Screen(id="alarms", name="Alarms", objects=[
            HmiObject(id=f"obj_{prefix}_alarm_panel", object_type="ALARM_INDICATOR", tag=None, label="Active Alarms"),
        ]),
    ]


def _nav(screen_ids: list[str]) -> list[NavigationLink]:
    links = []
    for sid in screen_ids:
        if sid == "dashboard":
            continue
        links.append(NavigationLink(from_screen="dashboard", to_screen=sid, label=sid.title()))
        links.append(NavigationLink(from_screen=sid, to_screen="dashboard", label="Dashboard"))
    return links


def _deps(objects_by_screen: dict[str, list[HmiObject]], alarms: list[Alarm]) -> list[Dependency]:
    deps = []
    for objs in objects_by_screen.values():
        for o in objs:
            if o.tag:
                deps.append(Dependency(source=o.id, target=o.tag, relation="BINDS_TO"))
    for a in alarms:
        deps.append(Dependency(source=a.id, target=a.tag, relation="TRIGGERS"))
    return deps


def conveyor_line(instance: int) -> Project:
    p = f"Conv{instance:02d}"
    tags = [
        Tag(name=f"{p}_Run", data_type="BOOL", description="Conveyor running", source="PLC"),
        Tag(name=f"{p}_Speed", data_type="REAL", unit="m/min", description="Belt speed", source="PLC"),
        Tag(name=f"{p}_JamDetect", data_type="BOOL", description="Jam sensor", source="PLC"),
        Tag(name=f"{p}_Overload", data_type="BOOL", description="Drive overload", source="PLC"),
    ]
    obj_dash = [
        HmiObject(id=f"obj_{p}_run", object_type="STATUS_INDICATOR", tag=f"{p}_Run", label="Run"),
        HmiObject(id=f"obj_{p}_speed", object_type="GAUGE", tag=f"{p}_Speed", label="Speed"),
    ]
    screens = [Screen(id="dashboard", name="Dashboard", objects=obj_dash),
               Screen(id="alarms", name="Alarms", objects=[HmiObject(id=f"obj_{p}_alarms", object_type="ALARM_INDICATOR", tag=None, label="Active Alarms")])]
    alarms = [
        Alarm(id=f"alm_{p}_jam", name="Conveyor Jam", tag=f"{p}_JamDetect", condition="EQ", threshold=1, severity="HIGH"),
        Alarm(id=f"alm_{p}_overload", name="Conveyor Overload", tag=f"{p}_Overload", condition="EQ", threshold=1, severity="CRITICAL"),
    ]
    deps = _deps({"dashboard": obj_dash}, alarms)
    return Project(project=ProjectMeta(name=f"Conveyor Line {instance}", description="Synthetic conveyor line variant"),
                    tags=tags, screens=screens, alarms=alarms, navigation=_nav(["dashboard", "alarms"]), dependencies=deps)


def packaging_machine(instance: int) -> Project:
    p = f"Pack{instance:02d}"
    tags = [
        Tag(name=f"{p}_CycleActive", data_type="BOOL", description="Packaging cycle active", source="PLC"),
        Tag(name=f"{p}_CycleCount", data_type="INT", description="Cycles completed", source="PLC"),
        Tag(name=f"{p}_SealTemp", data_type="REAL", unit="C", description="Seal bar temperature", source="PLC"),
        Tag(name=f"{p}_FilmLow", data_type="BOOL", description="Film roll low", source="PLC"),
    ]
    obj_dash = [
        HmiObject(id=f"obj_{p}_cycle", object_type="STATUS_INDICATOR", tag=f"{p}_CycleActive", label="Cycle Active"),
        HmiObject(id=f"obj_{p}_count", object_type="VALUE_DISPLAY", tag=f"{p}_CycleCount", label="Cycle Count"),
        HmiObject(id=f"obj_{p}_sealtemp", object_type="GAUGE", tag=f"{p}_SealTemp", label="Seal Temp"),
    ]
    screens = [Screen(id="dashboard", name="Dashboard", objects=obj_dash),
               Screen(id="alarms", name="Alarms", objects=[HmiObject(id=f"obj_{p}_alarms", object_type="ALARM_INDICATOR", tag=None, label="Active Alarms")])]
    alarms = [
        Alarm(id=f"alm_{p}_sealtemp", name="Seal Temperature High", tag=f"{p}_SealTemp", condition="GT", threshold=190, severity="HIGH"),
        Alarm(id=f"alm_{p}_film", name="Film Roll Low", tag=f"{p}_FilmLow", condition="EQ", threshold=1, severity="MEDIUM"),
    ]
    deps = _deps({"dashboard": obj_dash}, alarms)
    return Project(project=ProjectMeta(name=f"Packaging Machine {instance}", description="Synthetic packaging machine variant"),
                    tags=tags, screens=screens, alarms=alarms, navigation=_nav(["dashboard", "alarms"]), dependencies=deps)


def pump_station(instance: int) -> Project:
    p = f"Pump{instance:02d}"
    tags = [
        Tag(name=f"{p}_Run", data_type="BOOL", description="Pump running", source="PLC"),
        Tag(name=f"{p}_DischargePressure", data_type="REAL", unit="bar", description="Discharge pressure", source="PLC"),
        Tag(name=f"{p}_FlowRate", data_type="REAL", unit="L/min", description="Flow rate", source="PLC"),
        Tag(name=f"{p}_DryRun", data_type="BOOL", description="Dry-run protection tripped", source="PLC"),
    ]
    obj_dash = [
        HmiObject(id=f"obj_{p}_run", object_type="STATUS_INDICATOR", tag=f"{p}_Run", label="Run"),
        HmiObject(id=f"obj_{p}_pressure", object_type="GAUGE", tag=f"{p}_DischargePressure", label="Discharge Pressure"),
        HmiObject(id=f"obj_{p}_flow", object_type="TREND", tag=f"{p}_FlowRate", label="Flow Rate"),
    ]
    screens = [Screen(id="dashboard", name="Dashboard", objects=obj_dash),
               Screen(id="alarms", name="Alarms", objects=[HmiObject(id=f"obj_{p}_alarms", object_type="ALARM_INDICATOR", tag=None, label="Active Alarms")])]
    alarms = [
        Alarm(id=f"alm_{p}_dryrun", name="Dry Run Protection", tag=f"{p}_DryRun", condition="EQ", threshold=1, severity="CRITICAL"),
        Alarm(id=f"alm_{p}_lowpressure", name="Low Discharge Pressure", tag=f"{p}_DischargePressure", condition="LT", threshold=1.5, severity="HIGH"),
    ]
    deps = _deps({"dashboard": obj_dash}, alarms)
    return Project(project=ProjectMeta(name=f"Pump Station {instance}", description="Synthetic pump station variant"),
                    tags=tags, screens=screens, alarms=alarms, navigation=_nav(["dashboard", "alarms"]), dependencies=deps)


def tank_system(instance: int) -> Project:
    p = f"Tank{instance:02d}"
    tags = [
        Tag(name=f"{p}_Level", data_type="REAL", unit="%", description="Tank level", source="PLC"),
        Tag(name=f"{p}_InletValve", data_type="BOOL", description="Inlet valve open", source="PLC"),
        Tag(name=f"{p}_OutletValve", data_type="BOOL", description="Outlet valve open", source="PLC"),
        Tag(name=f"{p}_HighHighLevel", data_type="BOOL", description="High-high level switch", source="PLC"),
    ]
    obj_dash = [
        HmiObject(id=f"obj_{p}_level", object_type="GAUGE", tag=f"{p}_Level", label="Level"),
        HmiObject(id=f"obj_{p}_inlet", object_type="STATUS_INDICATOR", tag=f"{p}_InletValve", label="Inlet Valve"),
        HmiObject(id=f"obj_{p}_outlet", object_type="STATUS_INDICATOR", tag=f"{p}_OutletValve", label="Outlet Valve"),
    ]
    screens = [Screen(id="dashboard", name="Dashboard", objects=obj_dash),
               Screen(id="alarms", name="Alarms", objects=[HmiObject(id=f"obj_{p}_alarms", object_type="ALARM_INDICATOR", tag=None, label="Active Alarms")])]
    alarms = [
        Alarm(id=f"alm_{p}_hh", name="Tank High-High Level", tag=f"{p}_HighHighLevel", condition="EQ", threshold=1, severity="CRITICAL"),
        Alarm(id=f"alm_{p}_low", name="Tank Low Level", tag=f"{p}_Level", condition="LT", threshold=10, severity="MEDIUM"),
    ]
    deps = _deps({"dashboard": obj_dash}, alarms)
    return Project(project=ProjectMeta(name=f"Tank System {instance}", description="Synthetic tank system variant"),
                    tags=tags, screens=screens, alarms=alarms, navigation=_nav(["dashboard", "alarms"]), dependencies=deps)


def filling_machine(instance: int) -> Project:
    p = f"Fill{instance:02d}"
    tags = [
        Tag(name=f"{p}_Run", data_type="BOOL", description="Filling machine running", source="PLC"),
        Tag(name=f"{p}_FillWeight", data_type="REAL", unit="g", description="Current fill weight", source="PLC"),
        Tag(name=f"{p}_RejectCount", data_type="INT", description="Rejected units", source="PLC"),
        Tag(name=f"{p}_NozzleClogged", data_type="BOOL", description="Nozzle clog sensor", source="PLC"),
    ]
    obj_dash = [
        HmiObject(id=f"obj_{p}_run", object_type="STATUS_INDICATOR", tag=f"{p}_Run", label="Run"),
        HmiObject(id=f"obj_{p}_weight", object_type="GAUGE", tag=f"{p}_FillWeight", label="Fill Weight"),
        HmiObject(id=f"obj_{p}_reject", object_type="VALUE_DISPLAY", tag=f"{p}_RejectCount", label="Reject Count"),
    ]
    screens = [Screen(id="dashboard", name="Dashboard", objects=obj_dash),
               Screen(id="alarms", name="Alarms", objects=[HmiObject(id=f"obj_{p}_alarms", object_type="ALARM_INDICATOR", tag=None, label="Active Alarms")])]
    alarms = [
        Alarm(id=f"alm_{p}_clog", name="Nozzle Clogged", tag=f"{p}_NozzleClogged", condition="EQ", threshold=1, severity="HIGH"),
        Alarm(id=f"alm_{p}_underfill", name="Underfill Detected", tag=f"{p}_FillWeight", condition="LT", threshold=490, severity="MEDIUM"),
    ]
    deps = _deps({"dashboard": obj_dash}, alarms)
    return Project(project=ProjectMeta(name=f"Filling Machine {instance}", description="Synthetic filling machine variant"),
                    tags=tags, screens=screens, alarms=alarms, navigation=_nav(["dashboard", "alarms"]), dependencies=deps)


TEMPLATES = {
    "conveyor_line": conveyor_line,
    "packaging_machine": packaging_machine,
    "pump_station": pump_station,
    "tank_system": tank_system,
    "filling_machine": filling_machine,
}
