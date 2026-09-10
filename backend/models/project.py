"""Pydantic models for the neutral HMI project representation.

This is NOT a native Schneider EOTE project format. It is a vendor-neutral
structured representation used to demonstrate the engineering workflow.
"""
from __future__ import annotations
from typing import List, Optional, Literal, Any
from pydantic import BaseModel, Field


class ProjectMeta(BaseModel):
    name: str
    version: str = "1.0"
    description: Optional[str] = None


class Tag(BaseModel):
    name: str
    data_type: Literal["BOOL", "INT", "REAL", "STRING"] = "REAL"
    unit: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None  # e.g. PLC address, MOCK, etc.


class HmiObject(BaseModel):
    id: str
    object_type: Literal[
        "BUTTON", "VALUE_DISPLAY", "GAUGE", "STATUS_INDICATOR", "TREND", "ALARM_INDICATOR"
    ]
    tag: Optional[str] = None
    label: Optional[str] = None
    x: int = 0
    y: int = 0
    width: int = 120
    height: int = 80


class Screen(BaseModel):
    id: str
    name: str
    objects: List[HmiObject] = Field(default_factory=list)


class Alarm(BaseModel):
    id: str
    name: str
    tag: str
    condition: Literal["GT", "LT", "EQ", "NEQ"] = "GT"
    threshold: float
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "MEDIUM"


class NavigationLink(BaseModel):
    from_screen: str
    to_screen: str
    label: Optional[str] = None


class Dependency(BaseModel):
    source: str
    target: str
    relation: Literal["USES", "BINDS_TO", "TRIGGERS", "NAVIGATES_TO", "DEPENDS_ON", "CONTAINS"]


class Project(BaseModel):
    project: ProjectMeta
    tags: List[Tag] = Field(default_factory=list)
    screens: List[Screen] = Field(default_factory=list)
    alarms: List[Alarm] = Field(default_factory=list)
    navigation: List[NavigationLink] = Field(default_factory=list)
    scripts: List[Any] = Field(default_factory=list)
    dependencies: List[Dependency] = Field(default_factory=list)

    def get_tag(self, name: str) -> Optional[Tag]:
        return next((t for t in self.tags if t.name == name), None)

    def get_screen(self, screen_id: str) -> Optional[Screen]:
        return next((s for s in self.screens if s.id == screen_id), None)
