import { useState, useRef } from 'react'
import PriorityBadge from '../components/PriorityBadge'
import { useToast } from '../components/Toast'
import { triageIncident } from '../api'

const EXAMPLES = [
  { desc: 'Production database is down all services affected',    detail: 'All users getting 500 errors, revenue impacted' },
  { desc: 'SSL certificate expires in 2 days',                   detail: 'api.company.com certificate will expire causing HTTPS failures' },
  { desc: 'Kubernetes pods in CrashLoopBackOff state',           detail: 'Multiple pods restarting continuously in production namespace' },
  { desc: 'Wireless access is down in my area',                  detail: 'Entire floor cannot connect to network, affecting 50 users' },
  { desc: 'Application response time slow for users',            detail: 'P95 latency increased from 200ms to 800ms affecting 20% users' },
  { desc: 'Request to reset password for new employee',          detail: 'New hire needs access to internal portal' },
]

const PRIORITY_BG = { 1: 'rgba(255,45,85,0.08)', 2: 'rgba(255,149,0,0.08)', 3: 'rgba(255,204,0,0.08)', 4: 'rgba(48,209,88,0.08)' }
const PRIORITY_LABELS = { 1: 'P1 Critical', 2: 'P2 High', 3: 'P3 Medium', 4: 'P4 Low' }

export default function LiveTriage() {
  const [form, setForm]         = useState({ short_description: '', description: '', caller: '', snow_sys_id: '', push_to_snow: false })
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError]       = useState('')
  const [steps, setSteps]       = useState([])
  const toast = useToast()

  const handleTriage = async () => {
    if (!form.short_description.trim()) { toast.warning('Please enter a short description'); return }
    setLoading(true); setError(''); setResult(null); setSteps([])
    setScanning(true)
    setTimeout(() => setScanning(false), 1400)

    try {
      const r = await triageIncident({
        short_description: form.short_description,
        description:       form.description,
        caller:            form.caller,
        push_to_snow:      form.push_to_snow,
        snow_sys_id:       form.snow_sys_id || null,
      })
      setResult(r.data)
      toast.success(`Triaged as ${PRIORITY_LABELS[r.data.predicted_priority]} — ${r.data.predicted_group}`)
      if (r.data.pushed_to_snow) toast.info('Results pushed to ServiceNow')
      if (r.data.runbook_steps) {
        const s = r.data.runbook_steps.split('\n').filter(Boolean)
        s.forEach((step, i) => setTimeout(() => setSteps(prev => [...prev, step]), 600 + i * 180))
      }
    } catch (e) {
      const msg = e.response?.data?.detail || 'Triage failed'
      setError(msg); toast.error(msg)
    } finally { setLoading(false) }
  }

  const fillExample = (ex) => {
    setForm(f => ({ ...f, short_description: ex.desc, description: ex.detail }))
    setResult(null); setSteps([])
  }

  return (
    <div>
      <h1 className="page-title">⚡ Live Incident Triage</h1>
      <p className="page-sub">AI classifies priority, assigns team, and matches runbook in under 90 seconds</p>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Input */}
        <div>
          <div className={`glass scan-container ${scanning ? 'scanning' : ''}`}>
            <div className="section-title" style={{ marginBottom: '1.25rem' }}>📋 Incident Details</div>

            <div className="form-group">
              <label className="form-label">Short Description *</label>
              <input className="input" placeholder="e.g. Production database is down..."
                value={form.short_description}
                onChange={e => setForm(f => ({ ...f, short_description: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleTriage()} />
            </div>

            <div className="form-group">
              <label className="form-label">Full Description</label>
              <textarea className="textarea" rows={4} placeholder="Describe the incident in detail..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Caller / Reporter</label>
                <input className="input" placeholder="user@company.com"
                  value={form.caller} onChange={e => setForm(f => ({ ...f, caller: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">ServiceNow Sys ID</label>
                <input className="input" placeholder="Optional — to push back"
                  value={form.snow_sys_id} onChange={e => setForm(f => ({ ...f, snow_sys_id: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input type="checkbox" checked={form.push_to_snow}
                  onChange={e => setForm(f => ({ ...f, push_to_snow: e.target.checked }))}
                  style={{ accentColor: 'var(--primary)', width: 16, height: 16 }} />
                Push results back to ServiceNow
              </label>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <button className="btn btn-primary" onClick={handleTriage}
              disabled={loading || !form.short_description.trim()}
              style={{ width: '100%', justifyContent: 'center', padding: '0.875rem' }}>
              {loading ? <><span className="spinner" /> Analyzing...</> : 'Triage Now'}
            </button>
          </div>

          <div className="glass" style={{ marginTop: '1rem' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.875rem', fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Quick Examples
            </div>
            {EXAMPLES.map((ex, i) => (
              <button key={i} className="btn btn-ghost" onClick={() => fillExample(ex)}
                style={{ width: '100%', justifyContent: 'flex-start', marginBottom: '0.4rem', fontSize: '0.8rem', textAlign: 'left', padding: '0.6rem 0.875rem' }}>
                {ex.desc}
              </button>
            ))}
          </div>
        </div>

        {/* Result */}
        <div>
          {!result && !loading && (
            <div className="glass" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'float 3s ease-in-out infinite' }}>🤖</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                Enter an incident description and click<br />
                <strong style={{ color: 'var(--text)' }}>Triage Now</strong> to see AI analysis
              </div>
            </div>
          )}

          {loading && (
            <div className="glass" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1.5rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</div>
              <div style={{ color: 'var(--cyan)', fontFamily: 'var(--mono)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>ANALYZING INCIDENT...</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>Running ML classifier + runbook matcher</div>
              <div className="progress-track" style={{ marginTop: '1.5rem' }}>
                <div className="progress-fill" style={{ width: '70%' }} />
              </div>
            </div>
          )}

          {result && (
            <div className="result-card">
              <div className="glass" style={{ background: PRIORITY_BG[result.predicted_priority], marginBottom: '1rem', textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: '1rem', letterSpacing: '0.12em' }}>VERDICT</div>
                <PriorityBadge priority={result.predicted_priority} large />
                <div style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Category</div>
                    <span className="tag">{result.predicted_category}</span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Assign To</div>
                    <span className="tag">{result.predicted_group}</span>
                  </div>
                </div>
              </div>

              <div className="glass" style={{ marginBottom: '1rem' }}>
                <div className="grid-2">
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Confidence</div>
                    <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--p4)' }}>
                      {(result.confidence * 100).toFixed(1)}%
                    </div>
                    <div className="conf-bar">
                      <div className="conf-fill" style={{
                        width: `${result.confidence * 100}%`,
                        background: result.confidence > 0.8 ? 'var(--p4)' : result.confidence > 0.5 ? 'var(--p3)' : 'var(--p1)',
                        color: result.confidence > 0.8 ? 'var(--p4)' : 'var(--p3)',
                      }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Latency</div>
                    <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--cyan)' }}>
                      {result.latency_ms?.toFixed(1)}ms
                    </div>
                    <div style={{ fontSize: '0.75rem', color: result.pushed_to_snow ? 'var(--p4)' : 'var(--muted)', marginTop: '0.5rem' }}>
                      {result.pushed_to_snow ? '✅ Pushed to ServiceNow' : '— Not pushed'}
                    </div>
                  </div>
                </div>
              </div>

              {result.runbook_title && (
                <div className="glass">
                  <div style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>📋</span>
                    <span style={{ color: 'var(--cyan)' }}>{result.runbook_title}</span>
                  </div>
                  {steps.map((step, i) => {
                    const num  = step.match(/^(\d+)\./)?.[1]
                    const text = step.replace(/^\d+\.\s*/, '')
                    return (
                      <div key={i} className="runbook-step" style={{ animationDelay: `${i*80}ms` }}>
                        <div className="step-num">{num || i+1}</div>
                        <div style={{ fontSize: '0.8125rem', lineHeight: 1.6 }}>{text}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}