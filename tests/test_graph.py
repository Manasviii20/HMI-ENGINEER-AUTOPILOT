from backend.parser.project_parser import parse_project_file
from backend.graph.graph_builder import build_graph
from backend.graph.project_graph import ProjectGraph

DEMO = "data/demo_project.json"


def test_build_graph_nodes_and_edges():
    project = parse_project_file(DEMO)
    g = build_graph(project)
    assert g.has_node("Motor_01_Speed")
    assert g.has_node("dashboard")
    assert g.nodes["Motor_01_Speed"]["kind"] == "Tag"


def test_project_graph_tag_exists():
    project = parse_project_file(DEMO)
    pg = ProjectGraph(build_graph(project))
    assert pg.tag_exists("Motor_01_Temperature")
    assert not pg.tag_exists("Nonexistent_Tag")


def test_screen_exists():
    project = parse_project_file(DEMO)
    pg = ProjectGraph(build_graph(project))
    assert pg.screen_exists("dashboard")
    assert not pg.screen_exists("nonexistent_screen")
