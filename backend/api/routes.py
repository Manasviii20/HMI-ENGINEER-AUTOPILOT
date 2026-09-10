import json
import zipfile
from pathlib import Path

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse

from backend.api.schemas import (
    LoadProjectRequest, PlanRequest, ApplyRequest, ScenarioRequest,
    ApproveRequest, BreakBindingRequest,
)
from backend.api import store
from backend.parser.project_parser import parse_project_dict, summarize
from backend.graph.graph_builder import build_graph, graph_to_json
from backend.ai.planner import generate_plan
from backend.models.engineering import EngineeringPlan
from backend.hmi.project_generator import apply_plan
from backend.validation.validator import run_full_validation
from backend.ai.self_correction import run_self_correction
from backend.ai.llm_client import llm_client
from backend.simulator.machine import simulator

router = APIRouter(prefix="/api")

GENERATED_DIR = Path(__file__).resolve().parent.parent.parent / "generated"
GENERATED_DIR.mkdir(exist_ok=True)


@router.post("/projects/load")
def load_project(req: LoadProjectRequest):
    if req.project_data:
        project = parse_project_dict(req.project_data)
    else:
        project = store.load_demo()
    store.set_project(req.project_id, project)
    return {"project_id": req.project_id, "summary": summarize(project)}


@router.get("/projects/{project_id}")
def get_project(project_id: str):
    try:
        project = store.get_project(project_id)
    except KeyError as e:
        raise HTTPException(404, str(e))
    return {"project": project.model_dump(), "summary": summarize(project)}


@router.get("/projects/{project_id}/graph")
def get_graph(project_id: str):
    try:
        project = store.get_project(project_id)
    except KeyError as e:
        raise HTTPException(404, str(e))
    g = build_graph(project)
    return graph_to_json(g)


@router.post("/engineering/plan")
def engineering_plan(req: PlanRequest):
    try:
        project = store.get_project(req.project_id)
    except KeyError as e:
        raise HTTPException(404, str(e))
    plan = generate_plan(req.requirement, project)
    return {"plan": plan.model_dump(), "mock_mode": llm_client.mock_mode}


@router.post("/engineering/apply")
def engineering_apply(req: ApplyRequest):
    try:
        project = store.get_project(req.project_id)
    except KeyError as e:
        raise HTTPException(404, str(e))
    try:
        plan = EngineeringPlan.model_validate(req.plan)
    except Exception as e:
        raise HTTPException(422, f"Invalid EngineeringPlan: {e}")
    log = apply_plan(project, plan)
    store.set_project(req.project_id, project)
    return {"log": log, "project": project.model_dump(), "summary": summarize(project)}


@router.post("/simulation/start")
async def simulation_start(req: ApproveRequest):
    simulator.start()
    return {"status": "STARTED", "state": simulator.state}


@router.post("/simulation/scenario")
def simulation_scenario(req: ScenarioRequest):
    try:
        state = simulator.set_scenario(req.scenario)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"scenario": req.scenario, "state": state, "tags": simulator.as_tags()}


@router.websocket("/ws/simulation")
async def ws_simulation(ws: WebSocket):
    await ws.accept()
    simulator.start()

    async def send(payload):
        await ws.send_json(payload)

    simulator.subscribe(send)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        simulator.unsubscribe(send)


@router.get("/validation")
def get_validation(project_id: str = "demo"):
    try:
        project = store.get_project(project_id)
    except KeyError as e:
        raise HTTPException(404, str(e))
    return run_full_validation(project)


@router.post("/autofix")
def autofix(req: ApproveRequest):
    try:
        project = store.get_project(req.project_id)
    except KeyError as e:
        raise HTTPException(404, str(e))
    result = run_self_correction(project)
    store.set_project(req.project_id, project)
    return result


@router.post("/demo/break-binding")
def break_binding(req: BreakBindingRequest):
    """Intentionally introduces a MISSING_BINDING defect for the demo self-correction flow."""
    try:
        project = store.get_project(req.project_id)
    except KeyError as e:
        raise HTTPException(404, str(e))
    obj = None
    for s in project.screens:
        for o in s.objects:
            if o.id == req.object_id:
                obj = o
    if not obj:
        raise HTTPException(404, f"Object '{req.object_id}' not found")
    obj.tag = None
    store.set_project(req.project_id, project)
    return {"status": "BROKEN", "object_id": obj.id}


@router.post("/review/approve")
def approve(req: ApproveRequest):
    try:
        project = store.get_project(req.project_id)
    except KeyError as e:
        raise HTTPException(404, str(e))
    validation = run_full_validation(project)
    if validation["status"] != "PASS":
        raise HTTPException(400, "Cannot approve: validation has not passed")
    store.approve(req.project_id)
    return {"status": "APPROVED", "project_id": req.project_id}


@router.get("/export")
def export_project(project_id: str = "demo"):
    try:
        project = store.get_project(project_id)
    except KeyError as e:
        raise HTTPException(404, str(e))

    validation = run_full_validation(project)
    g = build_graph(project)

    files = {
        "project.json": project.model_dump(),
        "project_graph.json": graph_to_json(g),
        "tags.json": [t.model_dump() for t in project.tags],
        "screens.json": [s.model_dump() for s in project.screens],
        "alarms.json": [a.model_dump() for a in project.alarms],
        "validation_report.json": validation,
        "simulation_report.json": {"scenario": simulator.scenario, "state": simulator.state},
    }

    out_dir = GENERATED_DIR
    for name, content in files.items():
        with open(out_dir / name, "w", encoding="utf-8") as f:
            json.dump(content, f, indent=2)

    zip_path = out_dir / "hmi_engineering_project_package.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for name in files:
            zf.write(out_dir / name, arcname=name)

    return {"status": "EXPORTED", "files": list(files.keys()), "zip": str(zip_path.name),
            "approved": store.is_approved(project_id)}


@router.get("/export/download")
def download_export():
    zip_path = GENERATED_DIR / "hmi_engineering_project_package.zip"
    if not zip_path.exists():
        raise HTTPException(404, "No export found; call /api/export first")
    return FileResponse(zip_path, filename=zip_path.name, media_type="application/zip")
