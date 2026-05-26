import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import StatCard from '../components/StatCard'
import PriorityBadge from '../components/PriorityBadge'
import { SkeletonStats, SkeletonTable } from '../components/Skeleton'
import { getTriageStats, getTriageHistory } from '../api'

const COLORS = ['#ff2d55', '#ff9500', '#ffcc00', '#30d158']

export default function Dashboard() {
  const [stats,   setStats]   = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    Promise.all([
      getTriageStats().then(r => r.data),
      getTriageHistory(20).then(r => r.data),
    ]).then(([s, h]) => {
      setStats(s); setHistory(h); setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t) }, [])

  const pieData = stats ? [
    { name: 'P1 Critical', value: stats.by_priority?.P1 || 0 },
    { name: 'P2 High',     value: stats.by_priority?.P2 || 0 },
    { name: 'P3 Medium',   value: stats.by_priority?.P3 || 0 },
    { name: 'P4 Low',      value: stats.by_priority?.P4 || 0 },
  ] : []

  const total   = pieData.reduce((a, b) => a + b.value, 0)
  const barData = history.slice(0, 10).reverse().map((h, i) => ({
    name: `#${i+1}`, latency: parseFloat((h.latency_ms || 0).toFixed(1)),
  }))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Operations Center</h1>
          <p className="page-sub">
            <span className="live-dot" />
            Live — auto-refreshes every 15s
          </p>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--muted)',
          background: 'var(--surface)', padding: '0.5rem 0.875rem',
          borderRadius: 8, border: '1px solid var(--border)' }}>
          {new Date().toLocaleString()}
        </div>
      </div>

      {loading ? <SkeletonStats /> : stats && (
        <div className="stat-grid">
          <StatCard label="Total Triaged"   value={stats.total_triaged}         color="var(--cyan)"    delay={0}   extra="cyan"   />
          <StatCard label="Pushed to SNOW"  value={stats.pushed_to_snow}        color="var(--p4)"     delay={100} extra="green"  />
          <StatCard label="Automation Rate" value={`${stats.automation_rate}%`} color="var(--primary)" delay={200} extra="indigo" />
          <StatCard label="Avg Latency"     value={`${stats.avg_latency_ms}ms`} color="var(--p3)"     delay={300} extra="yellow" />
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="glass">
          <div className="section-header">
            <div className="section-title">🎯 Priority Distribution</div>
            {total > 0 && <span style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--muted)' }}>{total} total</span>}
          </div>
          {loading ? <div className="skeleton skeleton-card" /> : (
            <>
              <div style={{ position: 'relative' }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={95}
                      paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i]} style={{ filter: `drop-shadow(0 0 8px ${COLORS[i]})` }} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: '0.8rem' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: '1.5rem' }}>{total}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>total</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {['P1 Critical','P2 High','P3 Medium','P4 Low'].map((l,i) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--muted)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i], boxShadow: `0 0 6px ${COLORS[i]}`, display: 'inline-block' }} />
                    {l}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="glass">
          <div className="section-header">
            <div className="section-title">⚡ Triage Latency</div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--muted)' }}>last 10 runs</span>
          </div>
          {loading ? <div className="skeleton skeleton-card" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
                <XAxis dataKey="name" stroke="var(--muted)" tick={{ fontSize: 11, fontFamily: 'var(--mono)' }} />
                <YAxis stroke="var(--muted)" tick={{ fontSize: 11, fontFamily: 'var(--mono)' }} unit="ms" />
                <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: '0.8rem' }}
                  formatter={(v) => [`${v}ms`, 'Latency']} />
                <Bar dataKey="latency" fill="var(--primary)" radius={[4,4,0,0]}
                  style={{ filter: 'drop-shadow(0 0 4px rgba(99,102,241,0.5))' }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="glass-flat">
        <div className="section-header">
          <div className="section-title">📡 Live Triage Feed <span className="live-dot" style={{ marginLeft: 4 }} /></div>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>last 20 results</span>
        </div>
        {loading ? <SkeletonTable rows={6} /> : history.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">No triage history yet</div>
            <div className="empty-state-sub">Go to Live Triage and classify your first incident</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Incident</th><th>Priority</th><th>Category</th><th>Assigned To</th><th>Runbook</th><th>Confidence</th><th>Latency</th><th>Pushed</th></tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={h.id} style={{ animation: `slideUp 0.3s ease ${i*25}ms both` }}>
                    <td>
                      <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--cyan)', cursor: 'pointer' }}
                        onClick={() => navigator.clipboard.writeText(h.snow_number || '')}
                        title="Click to copy">
                        {h.snow_number || 'local'}
                      </span>
                    </td>
                    <td><PriorityBadge priority={h.priority} /></td>
                    <td><span className="tag">{h.category}</span></td>
                    <td style={{ fontSize: '0.8rem' }}>{h.group}</td>
                    <td style={{ fontSize: '0.73rem', color: 'var(--muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.runbook || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div className="progress-track" style={{ width: 50 }}>
                          <div className="progress-fill" style={{ width: `${h.confidence*100}%` }} />
                        </div>
                        <span className="mono" style={{ fontSize: '0.72rem' }}>{(h.confidence*100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td><span className="mono" style={{ fontSize: '0.8rem', color: 'var(--p3)' }}>{h.latency_ms?.toFixed(0)}ms</span></td>
                    <td>{h.pushed ? '✅' : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
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