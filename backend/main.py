import logging
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.incidents import router as incidents_router
from routers.triage    import router as triage_router
from routers.runbooks  import router as runbooks_router

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Incident Triage Agent",
    description="AI-powered incident triage — classifies priority, assigns team, matches runbook in <90 seconds.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(incidents_router)
app.include_router(triage_router)
app.include_router(runbooks_router)


@app.get("/health")
def health():
    return {"status": "ok"}