"""BM25-based runbook matcher."""
from __future__ import annotations
from typing import Dict, List, Optional
from rank_bm25 import BM25Okapi
from database import SessionLocal
from models import Runbook


def _load_runbooks() -> List[Dict]:
    db = SessionLocal()
    try:
        books = db.query(Runbook).all()
        return [{"id": b.id, "title": b.title, "category": b.category,
                 "keywords": b.keywords or "", "steps": b.steps or ""} for b in books]
    finally:
        db.close()


def find_runbook(
    description: str,
    category: Optional[str] = None,
    top_k: int = 1,
) -> List[Dict]:
    runbooks = _load_runbooks()
    if not runbooks:
        return []

    # Build corpus from title + keywords
    corpus = [(f"{rb['title']} {rb['keywords']}").lower().split() for rb in runbooks]
    bm25   = BM25Okapi(corpus)
    query  = description.lower().split()
    scores = bm25.get_scores(query)

    # Boost score if category matches
    if category:
        for i, rb in enumerate(runbooks):
            if rb.get("category", "").lower() == category.lower():
                scores[i] *= 1.5

    top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]
    results = []
    for idx in top_indices:
        if scores[idx] > 0:
            results.append({**runbooks[idx], "score": round(float(scores[idx]), 4)})
    return results