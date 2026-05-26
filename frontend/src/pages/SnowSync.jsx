import { useState, useEffect } from 'react'
import PriorityBadge from '../components/PriorityBadge'
import { useToast } from '../components/Toast'
import { SkeletonTable } from '../components/Skeleton'
import { testConnection, syncIncidents, getIncidents, triageIncident } from '../api'

export default function SnowSync() {
  const [conn,       setConn]       = useState(null)
  const [incidents,  setIncidents]  = useState([])
  const [loadingInc, setLoadingInc] = useState(true)
  const [limit,      setLimit]      = useState(20)
  const [pushBack,   setPushBack]   = useState(true)
  const [syncing,    setSyncing]    = useState(false)
  const [progress,   setProgress]   = useState(0)
  const [results,    setResults]    = useState([])
  const [currentInc, setCurrentInc] = useState('')
  const [done,       setDone]       = useState(false)
  const toast = useToast()

  useEffect(() => {
    testConnection().then(r => setConn(r.data)).catch(() => setConn({ connected: false }))
    loadIncidents()
  }, [])

  const loadIncidents = () => {
    setLoadingInc(true)
    getIncidents(100).then(r => { setIncidents(r.data); setLoadingInc(false) }).catch(() => setLoadingInc(false))
  }

  const handleSyncAndTriage = async () => {
    setSyncing(true); setResults([]); setProgress(0); setDone(false)

    try {
      const syncRes = await syncIncidents(limit)
      toast.info(`Synced ${syncRes.data.synced} new incidents`)
    } catch { toast.error('Sync failed') }

    let incs = []
    try {
      const r = await getIncidents(limit)
      incs = r.data.filter(i => i.snow_sys_id && i.short_description)
      setIncidents(r.data)
    } catch {}

    const res = []
    for (let i = 0; i < incs.length; i++) {
      const inc = incs[i]
      setCurrentInc(`${inc.snow_number || 'local'} — ${(inc.short_description || '').slice(0, 50)}`)
      setProgress(Math.round((i / incs.length) * 100))
      try {
        const r = await triageIncident({
          short_description: inc.short_description,
          description:       inc.description || '',
          push_to_snow:      pushBack,
          snow_sys_id:       inc.snow_sys_id,
        })
        res.push({
          number:     inc.snow_number || 'local',
          desc:       (inc.short_description || '').slice(0, 45) + '...',
          priority:   r.data.predicted_priority,
          category:   r.data.predicted_category,
          group:      r.data.predicted_group,
          confidence: (r.data.confidence * 100).toFixed(0),
          runbook:    r.data.runbook_title || '—',
          pushed:     r.data.pushed_to_snow,
          latency:    r.data.latency_ms?.toFixed(0),
        })
      } catch {}
    }

    setResults(res); setProgress(100); setCurrentInc(''); setDone(true); setSyncing(false)
    toast.success(`Triaged ${res.length} incidents${pushBack ? ' — pushed to ServiceNow' : ''}`)
    loadIncidents()
  }

  return (
    <div>
      <h1 className="page-title">🔄 ServiceNow Sync</h1>
      <p className="page-sub">Sync incidents and auto-triage them all in one click</p>

      {/* Connection */}
      <div className="glass" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
          background: conn?.connected ? 'var(--p4)' : conn === null ? 'var(--muted)' : 'var(--p1)',
          boxShadow: `0 0 10px ${conn?.connected ? 'var(--p4)' : 'var(--p1)'}`,
          animation: conn?.connected ? 'p4pulse 2s infinite' : 'none',
        }} />
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
          {conn === null ? 'Checking connection...'
            : conn.connected ? `Connected to ${conn.instance}.service-now.com`
            : `Connection failed — check SNOW_PASSWORD in .env`}
        </span>
      </div>

      {/* Controls */}
      <div className="glass" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <label className="form-label">Incidents to sync</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <input type="range" min={5} max={100} step={5} value={limit}
                onChange={e => setLimit(Number(e.target.value))}
                style={{ accentColor: 'var(--primary)', width: 140 }} />
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--cyan)', fontWeight: 700 }}>{limit}</span>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
            <input type="checkbox" checked={pushBack} onChange={e => setPushBack(e.target.checked)}
              style={{ accentColor: 'var(--primary)', width: 16, height: 16 }} />
            Push triage results back to ServiceNow
          </label>

          <button className="btn btn-primary" onClick={handleSyncAndTriage}
            disabled={syncing} style={{ marginLeft: 'auto' }}>
            {syncing ? <><span className="spinner" /> Triaging...</> : '⚡ Sync + Auto-Triage All'}
          </button>
        </div>

        {syncing && (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{currentInc}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--cyan)', fontFamily: 'var(--mono)' }}>{progress}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {done && (
          <div className="alert alert-success" style={{ marginTop: '1rem', marginBottom: 0 }}>
            ✅ Triaged {results.length} incidents{pushBack ? ' and pushed results to ServiceNow!' : ''}
          </div>
        )}
      </div>

      {/* Triage results */}
      {results.length > 0 && (
        <div className="glass-flat" style={{ marginBottom: '1.5rem' }}>
          <div className="section-header">
            <div className="section-title">📊 Triage Results</div>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{results.length} incidents</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Number</th><th>Description</th><th>Priority</th><th>Category</th><th>Group</th><th>Confidence</th><th>Runbook</th><th>Pushed</th><th>Latency</th></tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} style={{ animation: `slideUp 0.3s ease ${i*20}ms both` }}>
                    <td><span className="mono" style={{ color: 'var(--cyan)', fontSize: '0.8rem' }}>{r.number}</span></td>
                    <td style={{ fontSize: '0.8rem', maxWidth: 200 }}>{r.desc}</td>
                    <td><PriorityBadge priority={r.priority} /></td>
                    <td><span className="tag">{r.category}</span></td>
                    <td style={{ fontSize: '0.8rem' }}>{r.group}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div className="progress-track" style={{ width: 50 }}>
                          <div className="progress-fill" style={{ width: `${r.confidence}%` }} />
                        </div>
                        <span className="mono" style={{ fontSize: '0.72rem' }}>{r.confidence}%</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.72rem', color: 'var(--muted)', maxWidth: 160 }}>{r.runbook}</td>
                    <td>{r.pushed ? <span style={{ color: 'var(--p4)' }}>✅</span> : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                    <td><span className="mono" style={{ fontSize: '0.75rem', color: 'var(--p3)' }}>{r.latency}ms</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Incident list */}
      <div className="glass-flat">
        <div className="section-header">
          <div className="section-title">📡 Synced Incidents</div>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{incidents.length} total</span>
        </div>
        {loadingInc ? <SkeletonTable rows={8} /> : incidents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">No incidents synced yet</div>
            <div className="empty-state-sub">Click Sync + Auto-Triage All to pull incidents from ServiceNow</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Number</th><th>Description</th><th>Category</th><th>Priority</th><th>State</th></tr>
              </thead>
              <tbody>
                {incidents.map((inc, i) => (
                  <tr key={inc.id} style={{ animation: `slideUp 0.3s ease ${i*15}ms both` }}>
                    <td>
                      <span className="mono" style={{ color: 'var(--cyan)', fontSize: '0.8rem', cursor: 'pointer' }}
                        onClick={() => navigator.clipboard.writeText(inc.snow_number || '')}
                        title="Click to copy">
                        {inc.snow_number || 'local'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', maxWidth: 350 }}>{inc.short_description}</td>
                    <td><span className="tag">{inc.category || '—'}</span></td>
                    <td>{inc.priority ? <PriorityBadge priority={inc.priority} /> : <span className="muted">—</span>}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{inc.state || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}