"""Change Impact Analyzer: deterministic graph-based impact reasoning.

Given a plan or a tag/screen name, reports what depends on it. Pure graph
traversal — no LLM needed for this.
"""
import networkx as nx
from backend.graph.project_graph import ProjectGraph


def analyze_impact(graph: ProjectGraph, node_id: str) -> dict:
    g = graph.g
    if not g.has_node(node_id):
        return {"node": node_id, "status": "UNKNOWN", "affected": []}

    affected = list(nx.ancestors(g, node_id)) + list(nx.descendants(g, node_id))
    details = [{"id": n, "kind": g.nodes[n].get("kind", "Unknown")} for n in affected]
    return {"node": node_id, "status": "OK", "affected_count": len(details), "affected": details}
