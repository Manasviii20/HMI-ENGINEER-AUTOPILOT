from backend.parser.project_parser import parse_project_file
from backend.ai.planner import generate_plan
from backend.hmi.project_generator import apply_plan
from backend.validation.validator import run_full_validation
from backend.ai.self_correction import run_self_correction

DEMO = "data/demo_project.json"
REQUIREMENT = (
    "Add a motor overview screen showing motor speed, temperature and overload status. "
    "Add a high-temperature alarm and make the screen accessible from main navigation."
)


def _project_with_motor_overview():
    project = parse_project_file(DEMO)
    plan = generate_plan(REQUIREMENT, project)
    apply_plan(project, plan)
    return project


def test_generated_project_passes_validation():
    project = _project_with_motor_overview()
    result = run_full_validation(project)
    assert result["status"] == "PASS"


def test_broken_binding_is_autofixed():
    project = _project_with_motor_overview()
    gauge = next(o for s in project.screens for o in s.objects if o.object_type == "GAUGE")
    gauge.tag = None

    before = run_full_validation(project)
    assert before["status"] == "FAILED"

    result = run_self_correction(project)
    assert result["final_status"] == "PASS"
    assert len(result["cycles"]) <= 3


def test_self_correction_never_exceeds_max_cycles():
    project = _project_with_motor_overview()
    result = run_self_correction(project)
    assert len(result["cycles"]) <= 3
