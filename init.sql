CREATE TABLE IF NOT EXISTS incidents (
    id                SERIAL PRIMARY KEY,
    snow_sys_id       VARCHAR(64) UNIQUE,
    snow_number       VARCHAR(20),
    short_description TEXT,
    description       TEXT,
    caller            VARCHAR(255),
    category          VARCHAR(100),
    subcategory       VARCHAR(100),
    priority          INTEGER,
    state             VARCHAR(50),
    assigned_to       VARCHAR(255),
    assignment_group  VARCHAR(255),
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW(),
    synced_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS triage_results (
    id                  SERIAL PRIMARY KEY,
    incident_id         INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
    snow_number         VARCHAR(20),
    predicted_priority  INTEGER,
    predicted_category  VARCHAR(100),
    predicted_group     VARCHAR(255),
    confidence          FLOAT,
    runbook_id          INTEGER,
    runbook_title       VARCHAR(255),
    triage_notes        TEXT,
    pushed_to_snow      BOOLEAN DEFAULT FALSE,
    latency_ms          FLOAT,
    triaged_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS runbooks (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    category    VARCHAR(100),
    keywords    TEXT,
    steps       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS triage_stats (
    id              SERIAL PRIMARY KEY,
    date            DATE UNIQUE DEFAULT CURRENT_DATE,
    total_triaged   INTEGER DEFAULT 0,
    auto_assigned   INTEGER DEFAULT 0,
    avg_latency_ms  FLOAT DEFAULT 0,
    p1_count        INTEGER DEFAULT 0,
    p2_count        INTEGER DEFAULT 0,
    p3_count        INTEGER DEFAULT 0,
    p4_count        INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_incidents_snow    ON incidents(snow_sys_id);
CREATE INDEX IF NOT EXISTS idx_triage_incident   ON triage_results(incident_id);
CREATE INDEX IF NOT EXISTS idx_runbooks_category ON runbooks(category);

-- Pre-loaded runbooks
INSERT INTO runbooks (title, category, keywords, steps) VALUES
('Database Connection Pool Exhausted',
 'database',
 'database connection pool exhausted timeout sql postgres mysql',
 E'1. Check current connection count: SELECT count(*) FROM pg_stat_activity;\n2. Identify long-running queries: SELECT pid, now()-query_start AS duration, query FROM pg_stat_activity WHERE state = ''active'' ORDER BY duration DESC;\n3. Kill blocking connections if safe: SELECT pg_terminate_backend(pid);\n4. Increase max_connections in postgresql.conf if recurring\n5. Implement connection pooling via PgBouncer\n6. Alert DBA team if issue persists'),

('High CPU Usage on Application Server',
 'infrastructure',
 'cpu high usage load average performance slow server',
 E'1. SSH to affected server\n2. Run: top -bn1 | head -20 to identify top processes\n3. Check for runaway processes: ps aux --sort=-%cpu | head -10\n4. Review application logs for infinite loops or stuck threads\n5. If Java app: take thread dump with jstack\n6. Scale horizontally if load is legitimate traffic spike\n7. Page on-call if CPU > 90% for more than 10 minutes'),

('SSL Certificate Expiry Warning',
 'security',
 'ssl certificate expired expiry https tls warning',
 E'1. Check certificate expiry: openssl s_client -connect domain:443 2>/dev/null | openssl x509 -noout -dates\n2. If < 7 days: escalate to P1 immediately\n3. Renew via Let''s Encrypt: certbot renew\n4. Or request new cert from CA if commercial certificate\n5. Update load balancer and web server configs\n6. Verify renewal: curl -vI https://domain 2>&1 | grep expire\n7. Add monitoring alert for 30-day advance warning'),

('Service Endpoint Returning 5xx Errors',
 'application',
 'api endpoint 500 502 503 error http service down unavailable',
 E'1. Check error rate in monitoring dashboard\n2. Review application logs: tail -100 /var/log/app/error.log\n3. Test endpoint manually: curl -I https://api.example.com/health\n4. Check upstream dependencies (DB, cache, external APIs)\n5. Review recent deployments in last 2 hours\n6. If deployment-related: initiate rollback procedure\n7. Enable maintenance page if error rate > 50%'),

('Memory Leak Detected',
 'application',
 'memory leak out of memory oom heap jvm ram',
 E'1. Monitor memory trend: free -m every 60 seconds\n2. Check JVM heap: jmap -heap <pid>\n3. Generate heap dump: jmap -dump:format=b,file=heap.hprof <pid>\n4. Analyze with Eclipse MAT or VisualVM\n5. Review recent code changes for unclosed resources\n6. Implement fix and deploy to staging first\n7. Temporary fix: increase heap size -Xmx or restart service'),

('Network Connectivity Issues',
 'network',
 'network connectivity packet loss latency ping timeout unreachable',
 E'1. Test connectivity: ping -c 10 affected_host\n2. Traceroute: traceroute affected_host\n3. Check network interface: ip addr show\n4. Verify DNS resolution: nslookup affected_host\n5. Check firewall rules: iptables -L\n6. Review recent network changes or maintenance windows\n7. Escalate to network team with traceroute output'),

('Disk Space Critical',
 'infrastructure',
 'disk space full storage capacity inode low',
 E'1. Identify largest directories: du -sh /* 2>/dev/null | sort -rh | head -20\n2. Find large files: find / -size +1G -type f 2>/dev/null\n3. Check log rotation: ls -lh /var/log/\n4. Archive or compress old logs: gzip /var/log/*.log.1\n5. Clear temp files: rm -rf /tmp/* /var/tmp/*\n6. Expand disk if available in cloud console\n7. Set up disk space alert at 80% threshold'),

('Authentication Service Down',
 'security',
 'authentication login auth sso ldap oauth failed unauthorized',
 E'1. Check auth service health endpoint\n2. Review auth service logs for errors\n3. Verify LDAP/AD connectivity if applicable\n4. Check OAuth provider status page\n5. Verify SSL certificates for auth endpoints\n6. Test with service account credentials\n7. Failover to backup auth provider if configured\n8. Page security team immediately for P1 auth outages'),

('Kubernetes Pod CrashLoopBackOff',
 'infrastructure',
 'kubernetes pod crash crashloopbackoff container k8s restart',
 E'1. Check pod status: kubectl get pods -n namespace\n2. View pod logs: kubectl logs pod-name --previous\n3. Describe pod: kubectl describe pod pod-name\n4. Check resource limits: kubectl top pod pod-name\n5. Review recent config map or secret changes\n6. Check liveness/readiness probe configuration\n7. Scale down and redeploy: kubectl rollout restart deployment/name'),

('Database Slow Query Performance',
 'database',
 'slow query database performance index missing explain plan',
 E'1. Identify slow queries: SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;\n2. Run EXPLAIN ANALYZE on the slow query\n3. Check for missing indexes on WHERE clause columns\n4. Look for sequential scans on large tables\n5. Update table statistics: ANALYZE tablename;\n6. Add appropriate index: CREATE INDEX CONCURRENTLY ...\n7. Consider query rewriting or materialized views for complex queries');