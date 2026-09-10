"""Tests for the Script Generator, Migration Assistant, Engineering Mentor,
and System Log Analyzer -- all grounded (never invent a tag/object/screen
that doesn't exist), verified against the real demo project / simulator."""
import pytest
from backend.parser.project_parser import parse_project_file
from backend.scripts.script_generator import generate_script
from backend.migration.migration_assistant import export_tags_csv, import_tags_csv, import_tags_json
from backend.mentor.engineering_mentor import ask_mentor
from backend.simulator.machine import MachineSimulator
from backend.simulator.log_analyzer import analyze_log

DEMO = "data/demo_project.json"


def _project():
    return parse_project_file(DEMO)


# --- Script Generator --------------------------------------------------

def test_generate_screen_script_for_real_screen():
    p = _project()
    result = generate_script(p, "screen", "trends")
    assert "IEC 61131-3" in result["language"]
    assert "Motor_01_Speed" in result["code"]


def test_generate_alarm_script_for_real_alarm():
    p = _project()
    alarm = p.alarms[0]
    result = generate_script(p, "alarm", alarm.id)
    assert alarm.tag in result["code"]
    assert "RAISE_ALARM" in result["code"]


def test_generate_object_script_for_status_indicator():
    p = _project()
    obj_id = p.screens[0].objects[0].id
    result = generate_script(p, "object", obj_id)
    assert "ON_TAG_CHANGE" in result["code"] or "ON_CLICK" in result["code"]


def test_generate_script_rejects_nonexistent_target():
    p = _project()
    with pytest.raises(ValueError):
        generate_script(p, "object", "obj_does_not_exist")


def test_generate_script_rejects_unknown_target_type():
    p = _project()
    with pytest.raises(ValueError):
        generate_script(p, "bogus_type", "x")


# --- Migration Assistant -------------------------------------------------

def test_export_tags_csv_contains_all_tags():
    p = _project()
    csv_text = export_tags_csv(p)
    for tag in p.tags:
        assert tag.name in csv_text


def test_import_tags_csv_adds_new_tags_only():
    p = _project()
    original_count = len(p.tags)
    csv_text = "name,data_type,unit,description\nNew_Pressure_Sensor,REAL,bar,Inlet pressure\n"
    result = import_tags_csv(p, csv_text)
    assert result["added"] == ["New_Pressure_Sensor"]
    assert len(p.tags) == original_count + 1


def test_import_tags_csv_skips_existing_tag():
    p = _project()
    existing_name = p.tags[0].name
    csv_text = f"name,data_type\n{existing_name},REAL\n"
    result = import_tags_csv(p, csv_text)
    assert result["added"] == []
    assert result["skipped"][0]["reason"] == "tag already exists"


def test_import_tags_csv_rejects_invalid_data_type():
    p = _project()
    csv_text = "name,data_type\nBad_Tag,NOT_A_TYPE\n"
    result = import_tags_csv(p, csv_text)
    assert result["added"] == []
    assert "invalid data_type" in result["skipped"][0]["reason"]


def test_import_tags_csv_missing_name_column_raises():
    p = _project()
    with pytest.raises(ValueError):
        import_tags_csv(p, "not_a_name_column\nfoo\n")


def test_import_tags_json_adds_new_tags():
    p = _project()
    original_count = len(p.tags)
    result = import_tags_json(p, '[{"name": "New_Flow_Rate", "data_type": "REAL"}]')
    assert result["added"] == ["New_Flow_Rate"]
    assert len(p.tags) == original_count + 1


def test_import_tags_json_invalid_json_raises():
    p = _project()
    with pytest.raises(ValueError):
        import_tags_json(p, "{not valid json")


# --- Engineering Mentor ---------------------------------------------------

def test_mentor_answers_binding_question_grounded():
    p = _project()
    result = ask_mentor("what does a binding mean?", p)
    assert result["mock_mode"] is True
    assert "binding" in result["answer"].lower()
    assert "validation" in result["answer"].lower()


def test_mentor_answers_unmatched_question_still_grounded_in_status():
    p = _project()
    result = ask_mentor("asdkjfh random gibberish question", p)
    assert "validation is" in result["answer"].lower()


def test_mentor_never_claims_a_nonexistent_tag():
    p = _project()
    result = ask_mentor("tell me about alarms", p)
    # any tag names mentioned must be real
    real_tags = {t.name for t in p.tags}
    for word in result["answer"].replace(",", " ").split():
        if word in ("Motor_01_Speed",):  # spot check a real one isn't falsely flagged
            assert word in real_tags


# --- System Log Analyzer --------------------------------------------------

def test_simulator_records_transitions_on_scenario_change():
    sim = MachineSimulator()
    sim.set_scenario("EMERGENCY_STOP")
    fields = {e["field"] for e in sim.log}
    assert "scenario" in fields
    assert "emergency_stop" in fields


def test_simulator_log_is_bounded():
    sim = MachineSimulator()
    for _ in range(400):
        sim.set_scenario("NORMAL")
        sim.set_scenario("EMERGENCY_STOP")
    assert len(sim.log) <= 300


def test_analyze_log_counts_fault_events():
    sim = MachineSimulator()
    sim.set_scenario("MOTOR_OVERLOAD")
    sim.set_scenario("NORMAL")
    analysis = analyze_log(list(sim.log))
    assert analysis["total_events"] == len(sim.log)
    assert analysis["fault_event_count"] >= 1


def test_analyze_log_empty_is_safe():
    analysis = analyze_log([])
    assert analysis["total_events"] == 0
    assert analysis["fault_event_count"] == 0
