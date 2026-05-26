from __future__ import annotations
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date

from database import get_db
from models import Incident, TriageResult, TriageStat
from schemas import TriageRequest, TriageResponse
from ml.classifier import classify, is_loaded
from core.runbooks import find_runbook
from core.servicenow import update_incident

router = APIRouter(prefix="/triage", tags=["triage"])


@router.post("/", response_model=TriageResponse)
def triage_incident(payload: TriageRequest, db: Session = Depends(get_db)):
    if not is_loaded():
        raise HTTPException(503, "Model not trained. Run ml/train.py first.")

    t0 = time.perf_counter()

    # Classify
    result = classify(payload.short_description, payload.description or "")

    # Match runbook
    runbook_match = find_runbook(
        f"{payload.short_description} {payload.description}",
        category=result["category"],
    )
    runbook = runbook_match[0] if runbook_match else None

    # Build triage notes
    notes = (
        f"Auto-triage result:\n"
        f"Priority: {result['priority_label']} (confidence: {result['confidence']*100:.1f}%)\n"
        f"Category: {result['category']}\n"
        f"Assign to: {result['assignment_group']}\n"
    )
    if runbook:
        notes += f"Suggested runbook: {runbook['title']}\n"

    latency_ms = (time.perf_counter() - t0) * 1000
    pushed     = False

    # Push to ServiceNow if requested
    if payload.push_to_snow and payload.snow_sys_id:
        pushed = update_incident(
            sys_id=payload.snow_sys_id,
            priority=result["priority"],
            category=result["category"],
            assignment_group=result["assignment_group"],
            work_notes=notes,
        )

    # Save to local DB
    incident = None
    if payload.snow_sys_id:
        incident = db.query(Incident).filter(
            Incident.snow_sys_id == payload.snow_sys_id
        ).first()

    if not incident:
        incident = Incident(
            snow_sys_id=payload.snow_sys_id or f"local_{int(time.time())}",
            short_description=payload.short_description,
            description=payload.description,
            caller=payload.caller,
        )
        db.add(incident)
        db.flush()

    tr = TriageResult(
        incident_id=incident.id,
        snow_number=incident.snow_number,
        predicted_priority=result["priority"],
        predicted_category=result["category"],
        predicted_group=result["assignment_group"],
        confidence=result["confidence"],
        runbook_id=runbook["id"] if runbook else None,
        runbook_title=runbook["title"] if runbook else None,
        triage_notes=notes,
        pushed_to_snow=pushed,
        latency_ms=round(latency_ms, 2),
    )
    db.add(tr)

    # Update daily stats
    today = date.today()
    stat  = db.query(TriageStat).filter(TriageStat.date == today).first()
    if not stat:
        stat = TriageStat(
            date=today,
            total_triaged=0,
            auto_assigned=0,
            avg_latency_ms=0.0,
            p1_count=0,
            p2_count=0,
            p3_count=0,
            p4_count=0,
        )
        db.add(stat)
        db.flush()

    stat.total_triaged  = (stat.total_triaged  or 0) + 1
    stat.auto_assigned  = (stat.auto_assigned  or 0) + (1 if pushed else 0)
    pkey = f"p{result['priority']}_count"
    setattr(stat, pkey, (getattr(stat, pkey) or 0) + 1)

    db.commit()

    return TriageResponse(
        snow_number=incident.snow_number,
        predicted_priority=result["priority"],
        predicted_category=result["category"],
        predicted_group=result["assignment_group"],
        confidence=result["confidence"],
        runbook_title=runbook["title"] if runbook else None,
        runbook_steps=runbook["steps"] if runbook else None,
        triage_notes=notes,
        pushed_to_snow=pushed,
        latency_ms=round(latency_ms, 2),
    )


@router.get("/history")
def triage_history(limit: int = 50, db: Session = Depends(get_db)):
    results = db.query(TriageResult).order_by(
        TriageResult.triaged_at.desc()
    ).limit(limit).all()
    return [{"id": r.id, "snow_number": r.snow_number,
             "priority": r.predicted_priority,
             "category": r.predicted_category,
             "group": r.predicted_group,
             "confidence": r.confidence,
             "runbook": r.runbook_title,
             "pushed": r.pushed_to_snow,
             "latency_ms": r.latency_ms,
             "triaged_at": str(r.triaged_at)} for r in results]


@router.get("/stats")
def triage_stats(db: Session = Depends(get_db)):
    total    = db.query(func.count(TriageResult.id)).scalar() or 0
    pushed   = db.query(func.count(TriageResult.id)).filter(
        TriageResult.pushed_to_snow == True).scalar() or 0
    avg_ms   = db.query(func.avg(TriageResult.latency_ms)).scalar() or 0
    avg_conf = db.query(func.avg(TriageResult.confidence)).scalar() or 0

    by_priority = {}
    for p in [1, 2, 3, 4]:
        count = db.query(func.count(TriageResult.id)).filter(
            TriageResult.predicted_priority == p).scalar() or 0
        by_priority[f"P{p}"] = count

    return {
        "total_triaged":   total,
        "pushed_to_snow":  pushed,
        "automation_rate": round(pushed / max(total, 1) * 100, 1),
        "avg_latency_ms":  round(float(avg_ms), 2),
        "avg_confidence":  round(float(avg_conf), 4),
        "by_priority":     by_priority,
    }