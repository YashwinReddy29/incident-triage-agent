from __future__ import annotations
import os
import sys
from datetime import datetime, timezone
from typing import List

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Incident
from schemas import IncidentResponse
from core.servicenow import get_incidents, test_connection

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("/snow/test")
def test_snow_connection():
    return test_connection()


@router.post("/snow/sync")
def sync_from_servicenow(limit: int = 20, db: Session = Depends(get_db)):
    """Pull latest incidents from ServiceNow into local DB."""
    snow_incidents = get_incidents(limit=limit)
    if not snow_incidents:
        return {"synced": 0, "message": "No incidents found or connection failed."}

    synced = 0
    for si in snow_incidents:
        sys_id = si.get("sys_id", "")
        if not sys_id:
            continue
        existing = db.query(Incident).filter(Incident.snow_sys_id == sys_id).first()
        priority_val = si.get("priority", "3")
        if isinstance(priority_val, dict):
            priority_val = priority_val.get("value", "3")

        if existing:
            existing.synced_at = datetime.now(timezone.utc)
        else:
            inc = Incident(
                snow_sys_id=sys_id,
                snow_number=si.get("number", ""),
                short_description=si.get("short_description", ""),
                description=si.get("description", ""),
                category=si.get("category", ""),
                priority=int(priority_val) if str(priority_val).isdigit() else 3,
                state=si.get("state", ""),
                synced_at=datetime.now(timezone.utc),
            )
            db.add(inc)
            synced += 1

    db.commit()
    return {"synced": synced, "total_in_snow": len(snow_incidents)}


@router.get("/", response_model=List[IncidentResponse])
def list_incidents(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(Incident).order_by(Incident.created_at.desc()).limit(limit).all()