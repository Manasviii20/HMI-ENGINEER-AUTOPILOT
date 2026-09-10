"""Tests for the Synthetic Engineering Data Factory -- verifies templates are
valid, defects are genuinely injected/detected, and factory-level counts are
internally consistent (never inflated)."""
import random
import pytest

from backend.factory.templates import TEMPLATES
from backend.factory.defect_injector import inject_random_defects, DEFECT_TYPES, inject_defect
from backend.factory.runner import run_factory
from backend.validation.structural import validate_structural


@pytest.mark.parametrize("machine_type", list(TEMPLATES.keys()))
def test_every_template_starts_defect_free(machine_type):
    project = TEMPLATES[machine_type](1)
    assert validate_structural(project) == []


@pytest.mark.parametrize("machine_type", list(TEMPLATES.keys()))
def test_every_template_produces_distinct_instances(machine_type):
    p1 = TEMPLATES[machine_type](1)
    p2 = TEMPLATES[machine_type](2)
    assert p1.project.name != p2.project.name
    assert {t.name for t in p1.tags}.isdisjoint({t.name for t in p2.tags})


def test_missing_binding_defect_is_actually_detected():
    project = TEMPLATES["pump_station"](1)
    rng = random.Random(1)
    result = inject_defect(project, "MISSING_BINDING", rng)
    assert result is not None
    issues = validate_structural(project)
    assert any(i["type"] == "MISSING_BINDING" for i in issues)


def test_invalid_tag_defect_is_actually_detected():
    project = TEMPLATES["tank_system"](1)
    rng = random.Random(2)
    result = inject_defect(project, "INVALID_TAG", rng)
    assert result is not None
    issues = validate_structural(project)
    assert any(i["type"] == "INVALID_TAG" for i in issues)


def test_invalid_alarm_tag_defect_is_actually_detected():
    project = TEMPLATES["filling_machine"](1)
    rng = random.Random(3)
    result = inject_defect(project, "INVALID_ALARM_TAG", rng)
    assert result is not None
    issues = validate_structural(project)
    assert any(i["type"] == "INVALID_ALARM_TAG" for i in issues)


def test_broken_navigation_defect_is_actually_detected():
    project = TEMPLATES["conveyor_line"](1)
    rng = random.Random(4)
    result = inject_defect(project, "BROKEN_NAVIGATION", rng)
    assert result is not None
    issues = validate_structural(project)
    assert any(i["type"] == "BROKEN_NAVIGATION" for i in issues)


def test_no_navigation_path_defect_is_actually_detected():
    project = TEMPLATES["packaging_machine"](1)
    rng = random.Random(5)
    result = inject_defect(project, "NO_NAVIGATION_PATH", rng)
    assert result is not None
    issues = validate_structural(project)
    assert any(i["type"] == "NO_NAVIGATION_PATH" for i in issues)


def test_injector_never_exceeds_max_defects():
    for seed in range(20):
        project = TEMPLATES["conveyor_line"](1)
        rng = random.Random(seed)
        defects = inject_random_defects(project, rng, max_defects=3)
        assert len(defects) <= 3


def test_factory_is_deterministic_for_a_given_seed():
    result_a = run_factory(count=15, seed=99)
    result_b = run_factory(count=15, seed=99)
    assert result_a["total_defects_injected"] == result_b["total_defects_injected"]
    assert result_a["auto_corrected"] == result_b["auto_corrected"]
    assert result_a["needs_review"] == result_b["needs_review"]


def test_factory_counts_are_internally_consistent():
    result = run_factory(count=40, seed=7)
    assert result["generated"] == 40
    assert result["validated"] == 40
    assert result["defective_variants"] + result["clean_variants"] == 40
    assert result["auto_corrected"] + result["needs_review"] == result["defective_variants"]
    assert sum(result["machine_type_counts"].values()) == 40
    assert sum(result["defect_type_counts"].values()) == result["total_defects_injected"]


def test_factory_clamps_absurd_count():
    result = run_factory(count=100000, seed=1)
    assert result["generated"] <= 500


def test_factory_every_variant_ends_up_structurally_valid_or_flagged():
    result = run_factory(count=30, seed=3)
    for v in result["variants"]:
        if v["defects_injected"]:
            assert v["final_status"] in ("PASS", "FAILED")
            if v["final_status"] == "PASS":
                assert v["issues_after"] == 0
        else:
            assert v["final_status"] == "PASS"
            assert v["issues_after"] == 0
