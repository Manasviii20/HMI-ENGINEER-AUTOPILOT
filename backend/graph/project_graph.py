"""Thin wrapper exposing graph queries used by the AI planner and validators."""
import networkx as nx


class ProjectGraph:
    def __init__(self, g: nx.DiGraph):
        self.g = g

    def compact_context(self, focus_terms: list[str] | None = None) -> dict:
        """Builds a small, token-efficient context for the LLM: only node names
        grouped by kind, optionally filtered to nodes matching focus_terms."""
        by_kind: dict[str, list[str]] = {}
        for n, attrs in self.g.nodes(data=True):
            kind = attrs.get("kind", "Unknown")
            if focus_terms and not any(term.lower() in n.lower() for term in focus_terms):
                if kind == "Tag" and not any(term.lower() in n.lower() for term in focus_terms):
                    continue
            by_kind.setdefault(kind, []).append(n)
        return by_kind

    def tag_exists(self, tag_name: str) -> bool:
        return self.g.has_node(tag_name) and self.g.nodes[tag_name].get("kind") == "Tag"

    def screen_exists(self, screen_id: str) -> bool:
        return self.g.has_node(screen_id) and self.g.nodes[screen_id].get("kind") == "Screen"

    def alarms_for_tag(self, tag_name: str) -> list[str]:
        return [u for u, v, d in self.g.in_edges(tag_name, data=True) if d.get("relation") == "TRIGGERS"]
