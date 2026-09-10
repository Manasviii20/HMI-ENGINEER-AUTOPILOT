"""Change Impact Analyzer: deterministic graph-based impact reasoning.

Given a tag/object/screen/alarm node, reports what depends on it and what
it depends on. Pure graph traversal (NetworkX ancestors/descendants) --
no LLM needed for this, and no invented relationships: every edge here
comes directly from the project's real tags/objects/screens/alarms/
navigation as parsed into the graph.
"""
import networkx as nx
from backend.graph.project_graph import ProjectGraph


def _sorted_details(g: nx.DiGraph, node_ids) -> list[dict]:
    return sorted(
        ({"id": n, "kind": g.nodes[n].get("kind", "Unknown")} for n in node_ids),
        key=lambda d: (d["kind"], d["id"]),
    )


def analyze_impact(graph: ProjectGraph, node_id: str) -> dict:
    """Edges in this graph point from a dependent node to what it depends on
    (Screen --CONTAINS--> Object --BINDS_TO--> Tag, Alarm --TRIGGERS--> Tag).
    So if `node_id` changes: everything that can reach it (its ancestors) is
    downstream impact (things that depend ON it, e.g. a Tag's ancestors are
    the objects/alarms/screens that use it). Everything it can reach
    (descendants) is what it itself depends on."""
    g = graph.g
    if not g.has_node(node_id):
        return {"node": node_id, "status": "UNKNOWN", "affected": [], "depends_on_this": [], "this_depends_on": []}

    ancestors = nx.ancestors(g, node_id)
    descendants = nx.descendants(g, node_id)
    affected = list(ancestors) + list(descendants)
    details = [{"id": n, "kind": g.nodes[n].get("kind", "Unknown")} for n in affected]

    return {
        "node": node_id,
        "kind": g.nodes[node_id].get("kind", "Unknown"),
        "status": "OK",
        "affected_count": len(details),
        "affected": details,
        # things that would be affected if this node changes (impact)
        "depends_on_this": _sorted_details(g, ancestors),
        # things this node itself relies on
        "this_depends_on": _sorted_details(g, descendants),
    }
