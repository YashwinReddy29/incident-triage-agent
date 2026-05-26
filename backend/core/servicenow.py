"""ServiceNow REST API client."""
from __future__ import annotations
import os
import requests
from typing import Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

INSTANCE = os.getenv("SNOW_INSTANCE", "dev371350")
USER     = os.getenv("SNOW_USER", "admin")
PASSWORD = os.getenv("SNOW_PASSWORD", "")
BASE_URL = f"https://{INSTANCE}.service-now.com/api/now"


def _session() -> requests.Session:
    s = requests.Session()
    s.auth    = (USER, PASSWORD)
    s.headers = {
        "Content-Type": "application/json",
        "Accept":       "application/json",
    }
    return s


def get_incidents(
    limit: int = 50,
    state: Optional[str] = None,
    priority: Optional[int] = None,
) -> List[Dict]:
    """Fetch incidents from ServiceNow."""
    s = _session()
    params = {
        "sysparm_limit":  limit,
        "sysparm_fields": "sys_id,number,short_description,description,caller_id,category,subcategory,priority,state,assigned_to,assignment_group,sys_created_on",
        "sysparm_query":  "active=true^ORDERBYDESCsys_created_on",
    }
    if state:
        params["sysparm_query"] += f"^state={state}"
    if priority:
        params["sysparm_query"] += f"^priority={priority}"

    try:
        r = s.get(f"{BASE_URL}/table/incident", params=params, timeout=15)
        r.raise_for_status()
        return r.json().get("result", [])
    except Exception as e:
        print(f"ServiceNow fetch error: {e}")
        return []


def get_incident(sys_id: str) -> Optional[Dict]:
    """Fetch single incident by sys_id."""
    s = _session()
    try:
        r = s.get(f"{BASE_URL}/table/incident/{sys_id}", timeout=10)
        r.raise_for_status()
        return r.json().get("result")
    except Exception as e:
        print(f"ServiceNow get error: {e}")
        return None


def create_incident(
    short_description: str,
    description: str = "",
    category: str = "inquiry",
    priority: int = 3,
    assignment_group: str = "",
    work_notes: str = "",
) -> Optional[Dict]:
    """Create a new incident in ServiceNow."""
    s = _session()
    payload = {
        "short_description": short_description,
        "description":       description,
        "category":          category,
        "priority":          str(priority),
        "work_notes":        work_notes,
    }
    if assignment_group:
        payload["assignment_group"] = assignment_group
    try:
        r = s.post(f"{BASE_URL}/table/incident", json=payload, timeout=15)
        r.raise_for_status()
        return r.json().get("result")
    except Exception as e:
        print(f"ServiceNow create error: {e}")
        return None


def update_incident(
    sys_id: str,
    priority: int,
    category: str,
    assignment_group: str,
    work_notes: str,
) -> bool:
    """Push triage results back to ServiceNow."""
    s = _session()
    payload = {
        "priority":         str(priority),
        "category":         category,
        "assignment_group": assignment_group,
        "work_notes":       work_notes,
    }
    try:
        r = s.patch(f"{BASE_URL}/table/incident/{sys_id}", json=payload, timeout=15)
        r.raise_for_status()
        return True
    except Exception as e:
        print(f"ServiceNow update error: {e}")
        return False


def test_connection() -> Dict:
    """Verify ServiceNow connectivity."""
    s = _session()
    try:
        r = s.get(f"{BASE_URL}/table/incident", params={"sysparm_limit": 1}, timeout=10)
        r.raise_for_status()
        return {"connected": True, "instance": INSTANCE}
    except Exception as e:
        return {"connected": False, "error": str(e), "instance": INSTANCE}