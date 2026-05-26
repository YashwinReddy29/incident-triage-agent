from __future__ import annotations
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Runbook
from schemas import RunbookResponse

router = APIRouter(prefix="/runbooks", tags=["runbooks"])


@router.get("/", response_model=List[RunbookResponse])
def list_runbooks(db: Session = Depends(get_db)):
    return db.query(Runbook).order_by(Runbook.category).all()


@router.get("/search")
def search_runbooks(q: str, db: Session = Depends(get_db)):
    from core.runbooks import find_runbook
    results = find_runbook(q, top_k=3)
    return {"query": q, "results": results}