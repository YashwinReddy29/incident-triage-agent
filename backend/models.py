from sqlalchemy import Column, Integer, String, Text, Boolean, Float, DateTime, Date, ForeignKey
from sqlalchemy.sql import func
from database import Base


class Incident(Base):
    __tablename__ = "incidents"
    id               = Column(Integer, primary_key=True)
    snow_sys_id      = Column(String(64), unique=True)
    snow_number      = Column(String(20))
    short_description = Column(Text)
    description      = Column(Text)
    caller           = Column(String(255))
    category         = Column(String(100))
    subcategory      = Column(String(100))
    priority         = Column(Integer)
    state            = Column(String(50))
    assigned_to      = Column(String(255))
    assignment_group = Column(String(255))
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), server_default=func.now())
    synced_at        = Column(DateTime(timezone=True), server_default=func.now())


class TriageResult(Base):
    __tablename__ = "triage_results"
    id                 = Column(Integer, primary_key=True)
    incident_id        = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"))
    snow_number        = Column(String(20))
    predicted_priority = Column(Integer)
    predicted_category = Column(String(100))
    predicted_group    = Column(String(255))
    confidence         = Column(Float)
    runbook_id         = Column(Integer)
    runbook_title      = Column(String(255))
    triage_notes       = Column(Text)
    pushed_to_snow     = Column(Boolean, default=False)
    latency_ms         = Column(Float)
    triaged_at         = Column(DateTime(timezone=True), server_default=func.now())


class Runbook(Base):
    __tablename__ = "runbooks"
    id         = Column(Integer, primary_key=True)
    title      = Column(String(255), nullable=False)
    category   = Column(String(100))
    keywords   = Column(Text)
    steps      = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TriageStat(Base):
    __tablename__ = "triage_stats"
    id             = Column(Integer, primary_key=True)
    date           = Column(Date, unique=True)
    total_triaged  = Column(Integer, default=0)
    auto_assigned  = Column(Integer, default=0)
    avg_latency_ms = Column(Float, default=0)
    p1_count       = Column(Integer, default=0)
    p2_count       = Column(Integer, default=0)
    p3_count       = Column(Integer, default=0)
    p4_count       = Column(Integer, default=0)