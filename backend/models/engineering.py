"""Pydantic models for AI-produced structured engineering plans.

The LLM must ONLY ever produce objects matching these schemas. Deterministic
backend code (backend/hmi/*) is the only thing that executes a plan.
"""
from __future__ import annotations
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


ActionType = Literal[
    "CREATE_SCREEN",
    "ADD_OBJECT",
    "CREATE_ALARM",
    "ADD_NAVIGATION",
    "ADD_BINDING",
    "MOVE_OBJECT",
    "GROUP_OBJECTS",
]


class EngineeringAction(BaseModel):
    action: ActionType
    screen: Optional[str] = None
    object_id: Optional[str] = None
    object_type: Optional[Literal[
        "BUTTON", "VALUE_DISPLAY", "GAUGE", "STATUS_INDICATOR", "TREND", "ALARM_INDICATOR"
    ]] = None
    tag: Optional[str] = None
    label: Optional[str] = None
    alarm: Optional[str] = None
    threshold: Optional[float] = None
    condition: Optional[Literal["GT", "LT", "EQ", "NEQ"]] = None
    severity: Optional[Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]] = None
    from_screen: Optional[str] = None
    to_screen: Optional[str] = None
    object_ids: Optional[List[str]] = None
    reason: Optional[str] = None


class EngineeringPlan(BaseModel):
    summary: str
    actions: List[EngineeringAction] = Field(default_factory=list)
    unknowns: List[str] = Field(default_factory=list)


class CorrectionAction(BaseModel):
    action: Literal["ADD_BINDING", "REMOVE_OBJECT", "ADD_NAVIGATION", "CREATE_ALARM", "UNKNOWN"]
    object: Optional[str] = None
    tag: Optional[str] = None
    screen: Optional[str] = None
    reason: str


class CorrectionPlan(BaseModel):
    issue_id: str
    actions: List[CorrectionAction] = Field(default_factory=list)
