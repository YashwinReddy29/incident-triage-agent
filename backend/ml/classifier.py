"""Load trained model and classify incidents."""
from __future__ import annotations
import os
import time
from pathlib import Path
from typing import Dict, Optional
import joblib

_bundle = None
MODEL_PATH = Path(os.getenv("MODEL_PATH", "./ml/triage_model.joblib"))


def _load():
    global _bundle
    if _bundle is None:
        _bundle = joblib.load(MODEL_PATH)
    return _bundle


def is_loaded() -> bool:
    return MODEL_PATH.exists()


def classify(description: str, context: str = "") -> Dict:
    """Classify incident and return priority, category, group, confidence."""
    bundle = _load()
    t0 = time.perf_counter()

    text = f"{description} {context}".strip()

    priority_pipeline = bundle["priority_pipeline"]
    category_pipeline = bundle["category_pipeline"]
    group_pipeline    = bundle["group_pipeline"]

    priority  = int(priority_pipeline.predict([text])[0])
    category  = str(category_pipeline.predict([text])[0])
    group     = str(group_pipeline.predict([text])[0])

    # Confidence from priority classifier
    proba      = priority_pipeline.predict_proba([text])[0]
    confidence = float(max(proba))

    latency_ms = (time.perf_counter() - t0) * 1000

    priority_labels = {1: "P1 - Critical", 2: "P2 - High", 3: "P3 - Medium", 4: "P4 - Low"}

    return {
        "priority":        priority,
        "priority_label":  priority_labels.get(priority, "P3 - Medium"),
        "category":        category,
        "assignment_group": group,
        "confidence":      round(confidence, 4),
        "latency_ms":      round(latency_ms, 2),
    }