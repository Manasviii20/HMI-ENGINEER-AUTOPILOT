"""Builds a NetworkX engineering dependency graph from a parsed Project."""
import networkx as nx
from backend.models.project import Project


def build_graph(project: Project) -> nx.DiGraph:
    g = nx.DiGraph()

    for tag in project.tags:
        g.add_node(tag.name, kind="Tag", data_type=tag.data_type, unit=tag.unit)

    for screen in project.screens:
        g.add_node(screen.id, kind="Screen", name=screen.name)
        for obj in screen.objects:
            g.add_node(obj.id, kind="Object", object_type=obj.object_type, label=obj.label)
            g.add_edge(screen.id, obj.id, relation="CONTAINS")
            if obj.tag:
                g.add_edge(obj.id, obj.tag, relation="BINDS_TO")

    for alarm in project.alarms:
        g.add_node(alarm.id, kind="Alarm", name=alarm.name, severity=alarm.severity, threshold=alarm.threshold)
        g.add_edge(alarm.id, alarm.tag, relation="TRIGGERS")

    for nav in project.navigation:
        g.add_edge(nav.from_screen, nav.to_screen, relation="NAVIGATES_TO", label=nav.label)

    for dep in project.dependencies:
        if not g.has_edge(dep.source, dep.target):
            g.add_edge(dep.source, dep.target, relation=dep.relation)

    return g


def graph_to_json(g: nx.DiGraph) -> dict:
    nodes = [{"id": n, **g.nodes[n]} for n in g.nodes]
    edges = [{"source": u, "target": v, **g.edges[u, v]} for u, v in g.edges]
    return {"nodes": nodes, "edges": edges}
