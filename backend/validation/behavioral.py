"""Behavioral + simulation-scenario validation against the machine simulator."""
from backend.models.project import Project
from backend.simulator.machine import SCENARIOS, TAG_MAP


def _evaluate_alarm(alarm, tag_value) -> bool:
    if tag_value is None:
        return False
    v = 1 if tag_value is True else (0 if tag_value is False else tag_value)
    t = alarm.threshold
    if alarm.condition == "GT":
        return v > t
    if alarm.condition == "LT":
        return v < t
    if alarm.condition == "EQ":
        return v == t
    if alarm.condition == "NEQ":
        return v != t
    return False


def run_scenario_tests(project: Project) -> list[dict]:
    """For each simulation scenario, checks expected alarm firing + core rules."""
    results = []
    for name, state in SCENARIOS.items():
        tag_values = {tag: state[field] for tag, field in TAG_MAP.items()}
        fired = []
        for alarm in project.alarms:
            if alarm.tag in tag_values and _evaluate_alarm(alarm, tag_values[alarm.tag]):
                fired.append(alarm.name)

        expected_alarms = []
        if name == "HIGH_TEMPERATURE":
            expected_alarms = [a.name for a in project.alarms if a.tag == "Motor_01_Temperature"]
        elif name == "MOTOR_OVERLOAD":
            expected_alarms = [a.name for a in project.alarms if a.tag == "Motor_01_Overload"]
        elif name == "EMERGENCY_STOP":
            expected_alarms = [a.name for a in project.alarms if a.tag == "Emergency_Stop"]
        elif name == "COMMUNICATION_LOSS":
            expected_alarms = [a.name for a in project.alarms if a.tag == "PLC_Communication"]

        issues = []
        missing = [a for a in expected_alarms if a not in fired]
        if missing:
            issues.append(f"Expected alarm(s) {missing} did not fire")

        if name == "EMERGENCY_STOP" and state["motor_running"] is not False:
            issues.append("RULE_ESTOP_STOPS_MOTOR violated: motor not stopped during emergency stop")
        if name == "COMMUNICATION_LOSS":
            comm_alarms = [a for a in project.alarms if a.tag == "PLC_Communication"]
            if not comm_alarms:
                issues.append("RULE_COMM_LOSS_ALARM violated: no alarm references PLC_Communication")

        results.append({
            "scenario": name,
            "status": "PASS" if not issues else "FAILED",
            "fired_alarms": fired,
            "expected_alarms": expected_alarms,
            "issues": issues,
        })
    return results
