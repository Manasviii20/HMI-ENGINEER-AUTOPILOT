from backend.parser.project_parser import parse_project_file, summarize

DEMO = "data/demo_project.json"


def test_parse_demo_project():
    project = parse_project_file(DEMO)
    assert project.project.name == "Packaging Line 01"
    assert len(project.tags) == 8
    assert len(project.screens) == 3
    assert len(project.alarms) == 4


def test_summarize():
    project = parse_project_file(DEMO)
    summary = summarize(project)
    assert summary["tag_count"] == 8
    assert "Motor_01_Speed" in summary["tags"]
