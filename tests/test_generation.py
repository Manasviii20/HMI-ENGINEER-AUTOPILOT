import pytest
from backend.parser.project_parser import parse_project_file
from backend.models.engineering import EngineeringPlan
from backend.hmi.project_generator import apply_plan, PlanExecutionError, apply_action
from backend.models.engineering import EngineeringAction

DEMO = "data/demo_project.json"


def test_apply_plan_creates_screen_object_alarm_nav():
    project = parse_project_file(DEMO)
    plan = EngineeringPlan(summary="test", actions=[
        {"action": "CREATE_SCREEN", "screen": "Motor Overview"},
        {"action": "ADD_OBJECT", "screen": "Motor Overview", "object_type": "GAUGE",
         "tag": "Motor_01_Speed", "label": "Speed"},
        {"action": "CREATE_ALARM", "alarm": "High Temperature", "tag": "Motor_01_Temperature",
         "threshold": 80, "condition": "GT", "severity": "HIGH"},
        {"action": "ADD_NAVIGATION", "from_screen": "dashboard", "to_screen": "motor_overview"},
    ])
    log = apply_plan(project, plan)
    assert all(entry["status"] == "APPLIED" for entry in log)
    assert project.get_screen("motor_overview") is not None
    assert len(project.get_screen("motor_overview").objects) == 1
    assert any(a.name == "High Temperature" for a in project.alarms)


def test_plan_rejects_nonexistent_tag():
    project = parse_project_file(DEMO)
    action = EngineeringAction(action="ADD_OBJECT", screen="Dashboard", object_type="GAUGE",
                                tag="Invented_Tag_That_Does_Not_Exist")
    with pytest.raises(PlanExecutionError):
        apply_action(project, action)
