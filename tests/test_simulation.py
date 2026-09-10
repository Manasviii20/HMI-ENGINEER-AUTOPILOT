from backend.simulator.machine import MachineSimulator, SCENARIOS, TAG_MAP


def test_all_scenarios_are_defined():
    expected = {"NORMAL", "HIGH_TEMPERATURE", "MOTOR_OVERLOAD", "EMERGENCY_STOP", "COMMUNICATION_LOSS"}
    assert expected.issubset(SCENARIOS.keys())


def test_set_scenario_updates_state():
    sim = MachineSimulator()
    state = sim.set_scenario("HIGH_TEMPERATURE")
    assert state["temperature"] == 90.0


def test_emergency_stop_stops_motor():
    sim = MachineSimulator()
    state = sim.set_scenario("EMERGENCY_STOP")
    assert state["motor_running"] is False
    assert state["emergency_stop"] is True


def test_communication_loss_flag():
    sim = MachineSimulator()
    state = sim.set_scenario("COMMUNICATION_LOSS")
    assert state["communication"] is False


def test_as_tags_maps_all_tags():
    sim = MachineSimulator()
    tags = sim.as_tags()
    assert set(tags.keys()) == set(TAG_MAP.keys())
