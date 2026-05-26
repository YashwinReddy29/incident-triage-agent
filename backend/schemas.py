from __future__ import annotations
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel


class IncidentResponse(BaseModel):
    id: int
    snow_sys_id: Optional[str]
    snow_number: Optional[str]
    short_description: Optional[str]
    category: Optional[str]
    priority: Optional[int]
    state: Optional[str]
    assignment_group: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


class TriageRequest(BaseModel):
    short_description: str
    description: Optional[str] = ""
    caller: Optional[str] = ""
    push_to_snow: bool = False
    snow_sys_id: Optional[str] = None


class TriageResponse(BaseModel):
    snow_number: Optional[str]
    predicted_priority: int
    predicted_category: str
    predicted_group: str
    confidence: float
    runbook_title: Optional[str]
    runbook_steps: Optional[str]
    triage_notes: str
    pushed_to_snow: bool
    latency_ms: float


class RunbookResponse(BaseModel):
    id: int
    title: str
    category: Optional[str]
    keywords: Optional[str]
    steps: Optional[str]
    model_config = {"from_attributes": True}