from typing import Optional, Any
from pydantic import BaseModel


class LoadProjectRequest(BaseModel):
    project_id: Optional[str] = "demo"
    project_data: Optional[dict] = None  # if provided, loads this instead of the bundled demo


class PlanRequest(BaseModel):
    project_id: str = "demo"
    requirement: str


class ApplyRequest(BaseModel):
    project_id: str = "demo"
    plan: dict  # EngineeringPlan-shaped dict


class ScenarioRequest(BaseModel):
    project_id: str = "demo"
    scenario: str


class ApproveRequest(BaseModel):
    project_id: str = "demo"


class BreakBindingRequest(BaseModel):
    project_id: str = "demo"
    object_id: str = "obj_motor_overview_gauge"


class ScriptRequest(BaseModel):
    project_id: str = "demo"
    target_type: str  # "object" | "alarm" | "screen"
    target_id: str


class ImportTagsRequest(BaseModel):
    project_id: str = "demo"
    format: str = "csv"  # "csv" | "json"
    content: str


class MentorRequest(BaseModel):
    project_id: str = "demo"
    question: str


class FactoryRunRequest(BaseModel):
    count: int = 50
    seed: int = 42
    max_defects: int = 2
