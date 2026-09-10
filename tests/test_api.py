"""End-to-end tests against the FastAPI app (in-process, via TestClient)."""
from fastapi.testclient import TestClient
from backend.main import app

REQUIREMENT = (
    "Add a motor overview screen showing motor speed, temperature and overload status. "
    "Add a high-temperature alarm and make the screen accessible from main navigation."
)


def _fresh_client():
    client = TestClient(app)
    client.post("/api/projects/load", json={"project_id": "demo"})
    return client


def test_health():
    client = _fresh_client()
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_load_and_get_project_includes_approved_flag():
    client = _fresh_client()
    res = client.get("/api/projects/demo")
    assert res.status_code == 200
    body = res.json()
    assert "approved" in body
    assert body["approved"] is False


def test_impact_endpoint_known_and_unknown_node():
    client = _fresh_client()
    res = client.get("/api/engineering/impact", params={"node_id": "Motor_01_Speed"})
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "OK"
    assert body["affected_count"] > 0

    res_unknown = client.get("/api/engineering/impact", params={"node_id": "Nonexistent_Node"})
    assert res_unknown.status_code == 200
    assert res_unknown.json()["status"] == "UNKNOWN"


def test_impact_direction_is_correct_for_a_tag():
    """A Tag has no outgoing edges in this graph (Object --BINDS_TO--> Tag,
    Alarm --TRIGGERS--> Tag), so changing a tag has zero upstream deps of its
    own, but real downstream impact: the objects/screens/alarms that use it."""
    client = _fresh_client()
    res = client.get("/api/engineering/impact", params={"node_id": "Motor_01_Speed"})
    body = res.json()
    assert body["this_depends_on"] == []
    depends_on_ids = {d["id"] for d in body["depends_on_this"]}
    assert "obj_trend_speed" in depends_on_ids  # the Trend object on the Trends screen binds to this tag
    kinds = {d["kind"] for d in body["depends_on_this"]}
    assert "Object" in kinds


def test_full_plan_apply_validate_approve_export_flow():
    client = _fresh_client()

    plan_res = client.post(
        "/api/engineering/plan", json={"project_id": "demo", "requirement": REQUIREMENT}
    )
    assert plan_res.status_code == 200
    plan = plan_res.json()["plan"]

    apply_res = client.post("/api/engineering/apply", json={"project_id": "demo", "plan": plan})
    assert apply_res.status_code == 200
    assert all(entry["status"] in ("APPLIED", "REJECTED") for entry in apply_res.json()["log"])

    validation_res = client.get("/api/validation", params={"project_id": "demo"})
    assert validation_res.status_code == 200
    assert validation_res.json()["status"] == "PASS"

    approve_res = client.post("/api/review/approve", json={"project_id": "demo"})
    assert approve_res.status_code == 200

    export_res = client.get("/api/export", params={"project_id": "demo"})
    assert export_res.status_code == 200
    assert export_res.json()["approved"] is True

    download_res = client.get("/api/export/download")
    assert download_res.status_code == 200
    assert download_res.headers["content-type"] == "application/zip"


def test_break_binding_unapproves_project():
    client = _fresh_client()
    approve_res = client.post("/api/review/approve", json={"project_id": "demo"})
    assert approve_res.status_code == 200
    assert client.get("/api/projects/demo").json()["approved"] is True

    client.post(
        "/api/demo/break-binding",
        json={"project_id": "demo", "object_id": "obj_trend_speed"},
    )
    assert client.get("/api/projects/demo").json()["approved"] is False


def test_approve_rejected_when_validation_fails():
    client = _fresh_client()
    client.post(
        "/api/demo/break-binding",
        json={"project_id": "demo", "object_id": "obj_trend_speed"},
    )
    res = client.post("/api/review/approve", json={"project_id": "demo"})
    assert res.status_code == 400


def test_autofix_endpoint_fixes_broken_default_trend_binding():
    client = _fresh_client()
    client.post(
        "/api/demo/break-binding",
        json={"project_id": "demo", "object_id": "obj_trend_speed"},
    )
    res = client.post("/api/autofix", json={"project_id": "demo"})
    assert res.status_code == 200
    assert res.json()["final_status"] == "PASS"


def test_simulation_scenario_endpoint():
    client = _fresh_client()
    res = client.post(
        "/api/simulation/scenario", json={"project_id": "demo", "scenario": "MOTOR_OVERLOAD"}
    )
    assert res.status_code == 200
    body = res.json()
    assert body["state"]["overload"] is True

    bad = client.post(
        "/api/simulation/scenario", json={"project_id": "demo", "scenario": "NOT_A_SCENARIO"}
    )
    assert bad.status_code == 400
