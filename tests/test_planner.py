"""Tests for the deterministic mock planner's ability to handle a wide
variety of requirement phrasings, not just the one canonical demo sentence."""
from backend.parser.project_parser import parse_project_file
from backend.ai.planner import generate_plan

DEMO = "data/demo_project.json"


def _project():
    return parse_project_file(DEMO)


def _actions_by_type(plan, action_type):
    return [a for a in plan.actions if a.action == action_type]


def test_canonical_demo_requirement_unchanged():
    p = _project()
    req = (
        "Add a motor overview screen showing motor speed, temperature and overload status. "
        "Add a high-temperature alarm and make the screen accessible from main navigation."
    )
    plan = generate_plan(req, p)
    assert _actions_by_type(plan, "CREATE_SCREEN")[0].screen == "Motor Overview"
    tags_added = {a.tag for a in _actions_by_type(plan, "ADD_OBJECT")}
    assert tags_added == {"Motor_01_Speed", "Motor_01_Temperature", "Motor_01_Overload"}
    alarm = _actions_by_type(plan, "CREATE_ALARM")[0]
    assert alarm.tag == "Motor_01_Temperature"
    assert alarm.threshold == 80.0
    assert _actions_by_type(plan, "ADD_NAVIGATION")


def test_requirement_with_no_screen_word_targets_dashboard():
    p = _project()
    plan = generate_plan("Show the conveyor run status and product sensor", p)
    assert not _actions_by_type(plan, "CREATE_SCREEN")
    objs = _actions_by_type(plan, "ADD_OBJECT")
    assert {o.tag for o in objs} == {"Conveyor_01_Run", "Product_Sensor"}
    assert all(o.screen == "Dashboard" for o in objs)


def test_boolean_alarm_defaults_to_true_condition():
    p = _project()
    plan = generate_plan("Add an alarm when the emergency stop is pressed", p)
    alarm = _actions_by_type(plan, "CREATE_ALARM")[0]
    assert alarm.tag == "Emergency_Stop"
    assert alarm.condition == "EQ"
    assert alarm.threshold == 1.0
    assert alarm.severity == "CRITICAL"


def test_boolean_alarm_loss_wording_defaults_to_false_condition():
    p = _project()
    plan = generate_plan("Add an alarm if PLC communication is lost", p)
    alarm = _actions_by_type(plan, "CREATE_ALARM")[0]
    assert alarm.tag == "PLC_Communication"
    assert alarm.condition == "EQ"
    assert alarm.threshold == 0.0


def test_numeric_alarm_never_invents_missing_threshold():
    p = _project()
    plan = generate_plan("Add an alarm on motor speed", p)
    assert not _actions_by_type(plan, "CREATE_ALARM")
    assert any("threshold" in u.lower() for u in plan.unknowns)


def test_numeric_alarm_with_explicit_threshold_and_comparison():
    p = _project()
    plan = generate_plan("Add an alarm when motor speed exceeds 100", p)
    alarm = _actions_by_type(plan, "CREATE_ALARM")[0]
    assert alarm.tag == "Motor_01_Speed"
    assert alarm.threshold == 100.0
    assert alarm.condition == "GT"


def test_new_screen_with_called_naming_pattern():
    p = _project()
    plan = generate_plan("Create a new screen called Alarms Overview with an alarm indicator panel", p)
    create = _actions_by_type(plan, "CREATE_SCREEN")[0]
    assert create.screen == "Alarms Overview"
    obj = _actions_by_type(plan, "ADD_OBJECT")[0]
    assert obj.object_type == "ALARM_INDICATOR"
    assert obj.tag is None
    assert not plan.unknowns


def test_explicit_object_type_words_are_honored():
    p = _project()
    plan = generate_plan("Add a speed gauge and a run button to the dashboard", p)
    objs = {o.tag: o.object_type for o in _actions_by_type(plan, "ADD_OBJECT")}
    assert objs["Motor_01_Speed"] == "GAUGE"
    assert objs["Motor_01_Run"] == "BUTTON"


def test_trend_keyword_produces_trend_object():
    p = _project()
    plan = generate_plan("Create a diagnostics screen with a temperature trend, accessible from navigation", p)
    obj = _actions_by_type(plan, "ADD_OBJECT")[0]
    assert obj.tag == "Motor_01_Temperature"
    assert obj.object_type == "TREND"
    assert _actions_by_type(plan, "ADD_NAVIGATION")


def test_meaningless_requirement_produces_no_actions_and_an_unknown():
    p = _project()
    plan = generate_plan("Please make everything look nice", p)
    assert plan.actions == []
    assert plan.unknowns


def test_referencing_existing_screen_does_not_create_a_duplicate():
    p = _project()
    plan = generate_plan("Add a product sensor status light to the trends screen", p)
    assert not _actions_by_type(plan, "CREATE_SCREEN")
    obj = _actions_by_type(plan, "ADD_OBJECT")[0]
    assert obj.screen == "Trends"
    assert obj.tag == "Product_Sensor"


def test_plan_never_invents_a_tag_name():
    p = _project()
    plan = generate_plan("Add a screen showing the hydraulic pressure and oil viscosity", p)
    assert not _actions_by_type(plan, "ADD_OBJECT")
    assert plan.unknowns
    real_tags = {t.name for t in p.tags}
    for action in plan.actions:
        if action.tag:
            assert action.tag in real_tags
