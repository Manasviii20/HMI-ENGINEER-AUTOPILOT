from backend.models.project import Project
from backend.validation.structural import validate_structural
from backend.validation.behavioral import run_scenario_tests


def run_structural_only_validation(project: Project) -> dict:
    """Structural checks only (tag bindings, alarm tag references, navigation).
    Use this instead of run_full_validation for projects whose tags don't
    match the behavioral validator's hardcoded demo-machine scenario rules
    (see backend/validation/behavioral.py) -- e.g. the Synthetic Engineering
    Data Factory's generated variants. Same response shape as
    run_full_validation minus the scenario_results/behavioral fields, so it
    can be passed as self_correction.run_self_correction's validate_fn."""
    structural_issues = validate_structural(project)
    return {
        "status": "PASS" if not structural_issues else "FAILED",
        "structural_issues": structural_issues,
        "summary": {"structural_issue_count": len(structural_issues)},
    }


def run_full_validation(project: Project) -> dict:
    structural_issues = validate_structural(project)
    scenario_results = run_scenario_tests(project)
    scenario_failed = [r for r in scenario_results if r["status"] == "FAILED"]

    status = "PASS" if not structural_issues and not scenario_failed else "FAILED"
    return {
        "status": status,
        "structural_issues": structural_issues,
        "scenario_results": scenario_results,
        "summary": {
            "structural_issue_count": len(structural_issues),
            "scenarios_passed": len(scenario_results) - len(scenario_failed),
            "scenarios_total": len(scenario_results),
        },
    }
