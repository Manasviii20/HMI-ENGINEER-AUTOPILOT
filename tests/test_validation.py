from backend.parser.project_parser import parse_project_file
from backend.validation.structural import validate_structural
from backend.validation.behavioral import run_scenario_tests
from backend.validation.validator import run_full_validation
from backend.models.project import HmiObject

DEMO = "data/demo_project.json"


def test_demo_project_passes_structural_validation():
    project = parse_project_file(DEMO)
    issues = validate_structural(project)
    assert issues == []


def test_missing_binding_detected():
    project = parse_project_file(DEMO)
    project.screens[0].objects.append(
        HmiObject(id="obj_broken", object_type="GAUGE", tag=None, label="Broken")
    )
    issues = validate_structural(project)
    assert any(i["type"] == "MISSING_BINDING" for i in issues)


def test_invalid_alarm_tag_detected():
    project = parse_project_file(DEMO)
    project.alarms[0].tag = "Does_Not_Exist"
    issues = validate_structural(project)
    assert any(i["type"] == "INVALID_ALARM_TAG" for i in issues)


def test_scenario_tests_pass_on_demo_project():
    project = parse_project_file(DEMO)
    results = run_scenario_tests(project)
    assert len(results) == 5
    assert all(r["status"] == "PASS" for r in results)


def test_full_validation_pass_status():
    project = parse_project_file(DEMO)
    result = run_full_validation(project)
    assert result["status"] == "PASS"
