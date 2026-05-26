from __future__ import annotations
import os, sys, joblib
import pandas as pd
from pathlib import Path
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
MODEL_PATH = Path(__file__).parent / "triage_model.joblib"

TRAINING_DATA = [
    # P1 - Database
    ("production database is down all services affected", 1, "database", "Database Team"),
    ("database connection pool exhausted unable to connect", 1, "database", "Database Team"),
    ("sql server crash data corruption detected", 1, "database", "Database Team"),
    ("postgres database down all queries failing", 1, "database", "Database Team"),
    ("mysql server unresponsive all connections refused", 1, "database", "Database Team"),
    ("oracle database tablespace full critical outage", 1, "database", "Database Team"),
    ("database cluster failover failed data loss risk", 1, "database", "Database Team"),
    ("database replication lag critical primary not responding", 1, "database", "Database Team"),
    ("database backup failed critical data loss", 1, "database", "Database Team"),

    # P1 - Network
    ("network is down entire office cannot connect", 1, "network", "Network Team"),
    ("wireless access is down in my area all users affected", 1, "network", "Network Team"),
    ("network file shares access issue entire department", 1, "network", "Network Team"),
    ("vpn is down remote workers cannot connect", 1, "network", "Network Team"),
    ("internet connectivity lost across all sites", 1, "network", "Network Team"),
    ("core network switch failure all traffic down", 1, "network", "Network Team"),
    ("dns server down all domain resolution failing", 1, "network", "Network Team"),
    ("firewall failure all network traffic blocked", 1, "network", "Network Team"),
    ("rain is leaking on main dns server hardware damage", 1, "network", "Network Team"),
    ("network packet loss complete outage connectivity gone", 1, "network", "Network Team"),
    ("unable to access team file share network drive down", 1, "network", "Network Team"),
    ("trouble getting to mail server network connectivity issue", 1, "network", "Network Team"),

    # P1 - Infrastructure
    ("server room flooding all hardware at risk", 1, "infrastructure", "Infrastructure Team"),
    ("data center power outage all systems down", 1, "infrastructure", "Infrastructure Team"),
    ("kubernetes cluster down all pods failing crashloopbackoff", 1, "infrastructure", "Infrastructure Team"),
    ("employee payroll application server is down hardware", 1, "infrastructure", "Infrastructure Team"),
    ("all virtual machines unresponsive hypervisor crash", 1, "infrastructure", "Infrastructure Team"),
    ("storage array failure data inaccessible", 1, "infrastructure", "Infrastructure Team"),
    ("can not access exchange server hardware failure", 1, "infrastructure", "Infrastructure Team"),
    ("server hardware failure needs replacement urgent", 1, "infrastructure", "Infrastructure Team"),

    # P1 - Security
    ("security breach detected unauthorized access production", 1, "security", "Security Team"),
    ("ransomware detected encrypting files across network", 1, "security", "Security Team"),
    ("authentication service down users cannot login", 1, "security", "Security Team"),
    ("data exfiltration detected sensitive data leak", 1, "security", "Security Team"),
    ("ddos attack website completely unreachable", 1, "security", "Security Team"),

    # P1 - Application
    ("website completely down users cannot access homepage", 1, "application", "Web Team"),
    ("payment service unavailable all transactions failing", 1, "application", "Web Team"),
    ("api gateway returning 503 errors for all requests", 1, "application", "Web Team"),
    ("sap hr application is not accessible all users", 1, "application", "Web Team"),
    ("sap financial accounting application appears to be down", 1, "application", "Web Team"),
    ("email server is down no emails sending or receiving", 1, "application", "Web Team"),
    ("erp system completely unavailable business stopped", 1, "application", "Web Team"),
    ("sap sales app is not accessible revenue impacted", 1, "application", "Web Team"),
    ("sap materials management is down critical outage", 1, "application", "Web Team"),

    # P2 - Database
    ("database slow queries response time above threshold", 2, "database", "Database Team"),
    ("database backup failed last night needs attention", 2, "database", "Database Team"),
    ("database disk space 90 percent full warning", 2, "database", "Database Team"),
    ("read replica lag increasing performance degraded", 2, "database", "Database Team"),
    ("need access to sales database for the west region", 2, "database", "Database Team"),
    ("database index missing slow query performance", 2, "database", "Database Team"),
    ("database connection errors intermittent", 2, "database", "Database Team"),

    # P2 - Network
    ("network latency elevated packet loss detected", 2, "network", "Network Team"),
    ("network storage unavailable intermittent access issues", 2, "network", "Network Team"),
    ("vpn client not launching since last software update", 2, "network", "Network Team"),
    ("wireless performance degraded slow speeds wifi", 2, "network", "Network Team"),
    ("performance problems with wifi speed degraded", 2, "network", "Network Team"),
    ("unable to access shared folder intermittent network", 2, "network", "Network Team"),
    ("network drive disconnecting intermittently", 2, "network", "Network Team"),
    ("network storage unavailable file share issues", 2, "network", "Network Team"),

    # P2 - Infrastructure
    ("high cpu usage on web servers performance degraded", 2, "infrastructure", "Infrastructure Team"),
    ("disk space 95 percent full on production servers", 2, "infrastructure", "Infrastructure Team"),
    ("kubernetes pods in crashloopbackoff state restarting", 2, "infrastructure", "Infrastructure Team"),
    ("memory leak detected application consuming all ram", 2, "infrastructure", "Infrastructure Team"),
    ("load balancer health checks failing for nodes", 2, "infrastructure", "Infrastructure Team"),
    ("need to add more memory to laptop hardware upgrade", 2, "infrastructure", "Infrastructure Team"),
    ("can not launch 64 bit windows virtual machine", 2, "infrastructure", "Infrastructure Team"),
    ("my desk phone does not work hardware issue", 2, "infrastructure", "Infrastructure Team"),

    # P2 - Security
    ("ssl certificate expires in 3 days urgent renewal", 2, "security", "Security Team"),
    ("failed login attempts detected possible brute force", 2, "security", "Security Team"),
    ("ssl certificate expiry warning 7 days remaining", 2, "security", "Security Team"),
    ("suspicious activity detected on admin account", 2, "security", "Security Team"),
    ("ssl tls certificate about to expire https warning", 2, "security", "Security Team"),

    # P2 - Application
    ("application returning 500 errors for subset of users", 2, "application", "Web Team"),
    ("sap materials management is slow performance issue", 2, "application", "Web Team"),
    ("performance problems with email intermittent delays", 2, "application", "Web Team"),
    ("manager cant access sap controlling application", 2, "application", "Web Team"),
    ("can not log into sap from laptop today", 2, "application", "Web Team"),
    ("having problems with sales tools performance slow", 2, "application", "Web Team"),
    ("issue with email intermittent delays sending", 2, "application", "Web Team"),

    # P3 - Application
    ("application response time slow but functional", 3, "application", "Web Team"),
    ("background job running slower than expected", 3, "application", "Web Team"),
    ("non-critical service returning occasional errors", 3, "application", "Web Team"),
    ("javascript error on hiring page of corporate website", 3, "application", "Web Team"),
    ("unable to post content on wiki page", 3, "application", "Web Team"),
    ("can not access sfa software intermittent issue", 3, "application", "Web Team"),

    # P3 - Network
    ("network latency slightly elevated not critical", 3, "network", "Network Team"),
    ("single network switch showing errors minor", 3, "network", "Network Team"),
    ("unable to access personal details payroll portal network", 3, "network", "Network Team"),

    # P3 - Infrastructure
    ("disk space at 80 percent consider cleanup", 3, "infrastructure", "Infrastructure Team"),
    ("single node showing elevated error rate", 3, "infrastructure", "Infrastructure Team"),
    ("cache hit rate lower than normal performance", 3, "infrastructure", "Infrastructure Team"),

    # P3 - Security
    ("ssl certificate expiry warning 30 days remaining", 3, "security", "Security Team"),
    ("certificate expiry warning one month advance notice", 3, "security", "Security Team"),

    # P4 - IT Support
    ("user unable to access specific report in dashboard", 4, "inquiry", "IT Support"),
    ("request to update user permissions access rights", 4, "inquiry", "IT Support"),
    ("password reset request for employee access", 4, "inquiry", "IT Support"),
    ("software installation request on workstation", 4, "inquiry", "IT Support"),
    ("user asking about feature availability question", 4, "inquiry", "IT Support"),
    ("request to add new user to system access", 4, "inquiry", "IT Support"),
    ("question about api documentation inquiry", 4, "inquiry", "IT Support"),
    ("request for additional storage quota", 4, "inquiry", "IT Support"),
    ("how do i create a subfolder question help", 4, "inquiry", "IT Support"),
    ("need a replacement iphone hardware request", 4, "inquiry", "IT Support"),
    ("please remove latest hotfix from pc request", 4, "inquiry", "IT Support"),
    ("request for a new service inquiry general", 4, "inquiry", "IT Support"),
    ("need help with remedy configuration question", 4, "inquiry", "IT Support"),
    ("sales forecast spreadsheet is read only access", 4, "inquiry", "IT Support"),
    ("unable to access personal details in payroll portal", 4, "inquiry", "IT Support"),
    ("can not get my weather report application", 4, "inquiry", "IT Support"),
    ("assessment atf test inquiry general", 4, "inquiry", "IT Support"),
    ("need access to common drive storage request", 4, "inquiry", "IT Support"),
    ("minor ui bug text alignment issue cosmetic", 4, "inquiry", "IT Support"),
    ("need access to sales db west region request", 4, "inquiry", "IT Support"),
]

# Augment
AUGMENTED = []
for desc, pri, cat, grp in TRAINING_DATA:
    AUGMENTED.append((desc, pri, cat, grp))
    words = desc.split()
    if len(words) > 5:
        AUGMENTED.append((" ".join(words[1:]),    pri, cat, grp))
        AUGMENTED.append((" ".join(words[:-1]),   pri, cat, grp))
        AUGMENTED.append((" ".join(words[::2]),   pri, cat, grp))


def train():
    df = pd.DataFrame(AUGMENTED, columns=["description", "priority", "category", "group"])
    X  = df["description"]

    # ── SINGLE split — same indices for all three targets ──
    idx = list(range(len(df)))
    from sklearn.model_selection import train_test_split as tts
    train_idx, test_idx = tts(idx, test_size=0.2, random_state=42,
                               stratify=df["priority"])

    X_train = X.iloc[train_idx]
    X_test  = X.iloc[test_idx]
    yp_train, yp_test = df["priority"].iloc[train_idx],  df["priority"].iloc[test_idx]
    yc_train, yc_test = df["category"].iloc[train_idx],  df["category"].iloc[test_idx]
    yg_train, yg_test = df["group"].iloc[train_idx],     df["group"].iloc[test_idx]

    # Priority
    priority_pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1,3), max_features=8000, sublinear_tf=True)),
        ("clf",   GradientBoostingClassifier(n_estimators=300, max_depth=5, learning_rate=0.08, random_state=42)),
    ])
    priority_pipeline.fit(X_train, yp_train)
    print("=== Priority ===")
    print(classification_report(yp_test, priority_pipeline.predict(X_test),
                                  target_names=["P1","P2","P3","P4"], zero_division=0))

    # Category
    category_pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1,3), max_features=8000, sublinear_tf=True)),
        ("clf",   RandomForestClassifier(n_estimators=300, random_state=42)),
    ])
    category_pipeline.fit(X_train, yc_train)
    print("=== Category ===")
    print(classification_report(yc_test, category_pipeline.predict(X_test), zero_division=0))

    # Group
    group_pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1,3), max_features=8000, sublinear_tf=True)),
        ("clf",   RandomForestClassifier(n_estimators=300, random_state=42)),
    ])
    group_pipeline.fit(X_train, yg_train)
    print("=== Group ===")
    print(classification_report(yg_test, group_pipeline.predict(X_test), zero_division=0))

    joblib.dump({
        "priority_pipeline": priority_pipeline,
        "category_pipeline": category_pipeline,
        "group_pipeline":    group_pipeline,
    }, MODEL_PATH)
    print(f"\nModel saved → {MODEL_PATH}")


if __name__ == "__main__":
    train()