"""Deterministic analysis of the simulator's own live event log.

This analyzes REAL events recorded by this process's running simulator (see
MachineSimulator._record_transitions) -- not a synthetic/fabricated log file.
It is honest about that scope: it cannot analyze a real PLC/machine fault
log, because no real machine or protocol sample was available to this
project (see README limitations).
"""
from collections import Counter

FAULT_ON_FIELDS = {"overload", "emergency_stop"}  # True == fault
FAULT_OFF_FIELDS = {"communication"}  # False == fault


def _is_fault_event(event: dict) -> bool:
    field, to = event["field"], event["to"]
    if field in FAULT_ON_FIELDS:
        return to is True
    if field in FAULT_OFF_FIELDS:
        return to is False
    return False


def analyze_log(log: list[dict]) -> dict:
    total = len(log)
    field_counts = Counter(e["field"] for e in log)
    fault_events = [e for e in log if _is_fault_event(e)]
    scenario_changes = [e for e in log if e["field"] == "scenario"]

    return {
        "total_events": total,
        "field_counts": dict(field_counts),
        "fault_event_count": len(fault_events),
        "fault_events": fault_events[-20:],
        "scenario_change_count": len(scenario_changes),
        "recent_events": list(log)[-25:],
    }
