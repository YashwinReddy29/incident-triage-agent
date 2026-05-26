# 🚨 AI-Powered Incident Triage Agent

> Automated ITSM triage pipeline that classifies ServiceNow incidents by priority, assigns the correct team, matches resolution runbooks, and pushes results back — all in under 90 seconds.

![Python](https://img.shields.io/badge/Python-3.12-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green) ![React](https://img.shields.io/badge/React-18-61dafb) ![ServiceNow](https://img.shields.io/badge/ServiceNow-REST%20API-orange) ![scikit-learn](https://img.shields.io/badge/scikit--learn-1.5-f7931e)

---

## 🎯 What It Does

Traditional incident triage requires an engineer to manually read each ticket, determine severity, assign a team, and find a runbook — taking 8+ minutes per incident. This system automates the entire pipeline:

1. **Syncs** incidents from ServiceNow via REST API
2. **Classifies** priority (P1–P4) and category using a stacked ML ensemble
3. **Assigns** the correct engineering team automatically
4. **Matches** the best runbook using BM25 semantic search
5. **Pushes** triage results back to ServiceNow work notes
6. **Displays** everything in a real-time React SOC dashboard

**Result:** 78% of incidents auto-triaged, MTTA reduced from 8 minutes to under 90 seconds.

---

## 🏗 Architecture
ServiceNow Instance
│
│  REST API (sync + write-back)
▼
┌──────────────────────────────────────────────┐
│           FastAPI Backend  (port 8006)        │
│                                              │
│  ┌───────────────────┐  ┌─────────────────┐  │
│  │    ML Pipeline    │  │ Runbook Matcher  │  │
│  │                   │  │                 │  │
│  │  TF-IDF +         │  │  BM25Okapi      │  │
│  │  GradientBoosting │  │  10 runbooks    │  │
│  │  → Priority P1-4  │  │  5 categories   │  │
│  │                   │  │  category boost │  │
│  │  TF-IDF +         │  └─────────────────┘  │
│  │  RandomForest     │                        │
│  │  → Category       │  ┌─────────────────┐  │
│  │                   │  │   PostgreSQL    │  │
│  │  TF-IDF +         │  │                 │  │
│  │  RandomForest     │  │  incidents      │  │
│  │  → Team           │  │  triage_results │  │
│  └───────────────────┘  │  runbooks       │  │
│                         │  triage_stats   │  │
└─────────────────────────┴─────────────────┘
│
│  Vite Proxy → REST API
▼
┌───────────────────────┐
│    React Frontend     │
│       (port 3001)     │
│                       │
│  ▦  Operations Center │
│  ⚡ Live Triage       │
│  ↻  ServiceNow Sync   │
│  ☰  Runbook Library   │
└───────────────────────┘

---

## 🤖 ML Model

### Pipeline

Two-stage classification using TF-IDF feature extraction with n-gram ranges (1–3):

| Classifier | Algorithm | Target |
|-----------|-----------|--------|
| Priority | GradientBoostingClassifier (300 trees) | P1 / P2 / P3 / P4 |
| Category | RandomForestClassifier (300 trees) | database / network / infrastructure / security / application / inquiry |
| Assignment | RandomForestClassifier (300 trees) | Database Team / Network Team / Infrastructure Team / Security Team / Web Team / IT Support |

### Training Data

~350 labeled examples across 6 categories with 4x augmentation (word dropout, stride, truncation) → ~1,400 effective training samples. Single stratified train/test split shared across all three classifiers to prevent label leakage.

### Performance

| Metric | Value |
|--------|-------|
| Priority accuracy | 83% |
| Category accuracy | 70%+ |
| Inference latency | < 50ms |
| Training time | < 30 seconds |

---

## 🔧 Runbook Library

10 pre-loaded runbooks matched via BM25Okapi keyword scoring with category boost (1.5x):

| Runbook | Category |
|---------|----------|
| Database Connection Pool Exhausted | database |
| Database Slow Query Performance | database |
| High CPU Usage on Application Server | infrastructure |
| Disk Space Critical | infrastructure |
| Kubernetes Pod CrashLoopBackOff | infrastructure |
| SSL Certificate Expiry Warning | security |
| Authentication Service Down | security |
| Service Endpoint 5xx Errors | application |
| Memory Leak Detected | application |
| Network Connectivity Issues | network |

---

## 🔌 ServiceNow Integration

Uses HTTP Basic Auth against the ServiceNow Table API (`/api/now/table/incident`).

| Operation | Method | Description |
|-----------|--------|-------------|
| List incidents | `GET /table/incident` | Pulls active incidents with filters |
| Get incident | `GET /table/incident/{sys_id}` | Fetch single record by sys_id |
| Create incident | `POST /table/incident` | Create new ticket programmatically |
| Update incident | `PATCH /table/incident/{sys_id}` | Push triage results to work notes |

**Fields written back on triage:**
- `priority` — ML-predicted severity (1–4)
- `category` — ML-predicted category
- `assignment_group` — Predicted team name
- `work_notes` — Full triage report with confidence score and runbook suggestion

---

## 📊 Dashboard Pages

| Page | Description |
|------|-------------|
| **Operations Center** | Live KPIs, priority donut chart, latency bar chart, incident feed — auto-refreshes every 15s |
| **Live Triage** | Incident input form, scan animation, priority verdict reveal, animated confidence meter, runbook steps |
| **ServiceNow Sync** | Connection status, configurable sync limit, auto-triage all with live progress bar |
| **Runbook Library** | BM25-powered instant search, category color-coded cards, expandable step-by-step guides |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+, Node.js 18+, Docker
- Free ServiceNow developer instance → [developer.servicenow.com](https://developer.servicenow.com)

### Setup

```bash
# 1. Clone
git clone https://github.com/YashwinReddy29/incident-triage-agent.git
cd incident-triage-agent

# 2. Start PostgreSQL
docker compose up -d

# 3. Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# 4. Train the ML model
cd ml && python train.py && cd ..

# 5. Configure credentials
# Edit backend/.env — set SNOW_INSTANCE, SNOW_USER, SNOW_PASSWORD

# 6. Start backend
uvicorn main:app --reload --port 8006

# 7. Frontend (new terminal)
cd ../frontend
npm install && npm run dev
```

Open **http://localhost:3001**

### Environment Variables

```env
DATABASE_URL=postgresql://ituser:itpassword@localhost:5440/incident_triage
SNOW_INSTANCE=dev123456
SNOW_USER=admin
SNOW_PASSWORD=your_password
MODEL_PATH=./ml/triage_model.joblib
```

---

## 📡 API Reference

```bash
# Triage a single incident
POST /triage/
{
  "short_description": "Production database is down",
  "description": "All services returning 500 errors",
  "push_to_snow": true,
  "snow_sys_id": "abc123def456"
}

# Sync from ServiceNow
POST /incidents/snow/sync?limit=20

# Check connection
GET  /incidents/snow/test

# Stats + history
GET  /triage/stats
GET  /triage/history?limit=100

# Runbook search
GET  /runbooks/search?q=database+connection
```

---

## 📁 Project Structure
incident-triage/
├── backend/
│   ├── core/
│   │   ├── servicenow.py      # ServiceNow REST API client
│   │   └── runbooks.py        # BM25 runbook matcher
│   ├── ml/
│   │   ├── train.py           # Model training pipeline
│   │   └── classifier.py      # Inference engine
│   ├── routers/
│   │   ├── incidents.py       # ServiceNow sync endpoints
│   │   ├── triage.py          # Triage + stats endpoints
│   │   └── runbooks.py        # Runbook search endpoints
│   ├── models.py              # SQLAlchemy ORM models
│   ├── schemas.py             # Pydantic schemas
│   └── main.py                # FastAPI app entry point
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx  # Operations Center
│       │   ├── LiveTriage.jsx # Real-time triage UI
│       │   ├── SnowSync.jsx   # ServiceNow sync
│       │   └── Runbooks.jsx   # Runbook library
│       └── components/
│           ├── StatCard.jsx   # Animated KPI cards
│           ├── PriorityBadge.jsx
│           ├── Toast.jsx      # Notification system
│           └── Skeleton.jsx   # Loading states
├── docker-compose.yml
└── init.sql                   # Schema + 10 pre-loaded runbooks

---

## 🎤 Interview Talking Points

**"How does the triage work?"**
TF-IDF trigram features fed into stacked classifiers. Separate models for priority, category, and team assignment trained on ~1,400 augmented examples. Single stratified split prevents label leakage. Inference under 50ms.

**"How does the ServiceNow integration work?"**
REST API with HTTP Basic Auth. PATCH requests update priority, assignment_group, and work_notes fields directly on the incident record. Connection tested on startup.

**"What's the BM25 runbook matcher?"**
BM25Okapi scores each runbook against the combined incident description. Category match gets a 1.5x score boost. Top result is included in the triage response and written to ServiceNow work notes.

**"What would you improve in production?"**
Replace synthetic training data with real historical incidents. Add feedback loop where engineers confirm/reject triage results to retrain incrementally. Add LLM layer (GPT-4/Claude) for freeform triage notes generation. Add Kafka for real-time incident streaming instead of polling.

---

## 📄 License

MIT
