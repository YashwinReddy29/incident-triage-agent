import { useState, useEffect } from 'react'
import { getRunbooks, searchRunbooks } from '../api'

const CATEGORY_COLORS = {
  database:       'var(--p1)',
  infrastructure: 'var(--p2)',
  security:       'var(--p3)',
  application:    'var(--primary)',
  network:        'var(--cyan)',
}
const CATEGORY_ICONS = {
  database: '🗄', infrastructure: '🖥', security: '🔒', application: '⚙️', network: '🌐',
}

export default function Runbooks() {
  const [runbooks, setRunbooks] = useState([])
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    getRunbooks().then(r => { setRunbooks(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const handleSearch = async (q) => {
    setQuery(q)
    if (!q.trim()) { setResults(null); return }
    try {
      const r = await searchRunbooks(q)
      setResults(r.data.results)
    } catch {}
  }

  const display = results || runbooks

  return (
    <div>
      <h1 className="page-title">📚 Runbook Library</h1>
      <p className="page-sub">BM25-indexed — automatically matched to incidents during triage</p>

      <div className="glass-flat" style={{ marginBottom: '1.5rem' }}>
        <input className="input" placeholder="🔍 Search runbooks... (e.g. database connection, SSL, kubernetes)"
          value={query} onChange={e => handleSearch(e.target.value)}
          style={{ fontSize: '0.9375rem', padding: '0.875rem 1rem' }} />
      </div>

      {results && (
        <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
          {results.length} matches for "{query}"
          {results[0] && <span style={{ marginLeft: '0.5rem', fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>
            — top score: {results[0].score?.toFixed(3)}
          </span>}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton skeleton-card" style={{ height: 72 }} />)}
        </div>
      ) : display.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">No runbooks found</div>
          <div className="empty-state-sub">Try a different search term</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {display.map((rb, i) => {
            const color  = CATEGORY_COLORS[rb.category] || 'var(--muted)'
            const icon   = CATEGORY_ICONS[rb.category]  || '📋'
            const isOpen = expanded === rb.id
            return (
              <div key={rb.id} className="glass"
                style={{ animation: `slideUp 0.3s ease ${i*40}ms both`, cursor: 'pointer',
                  borderColor: isOpen ? color : 'var(--border)',
                  boxShadow: isOpen ? `0 0 20px ${color}20` : 'none' }}
                onClick={() => setExpanded(isOpen ? null : rb.id)}>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                      background: `${color}20`, border: `1px solid ${color}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem',
                      boxShadow: isOpen ? `0 0 15px ${color}40` : 'none',
                      transition: 'box-shadow 0.3s',
                    }}>
                      {icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: '0.3rem' }}>{rb.title}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className="tag" style={{ color, borderColor: `${color}50`, background: `${color}15` }}>
                          {rb.category}
                        </span>
                        {rb.score != null && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                            relevance: {rb.score.toFixed(3)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span style={{ color: 'var(--muted)', transition: 'transform 0.2s',
                    transform: isOpen ? 'rotate(180deg)' : 'none', fontSize: '0.75rem' }}>▼</span>
                </div>

                {isOpen && (
                  <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)',
                    paddingTop: '1.25rem', animation: 'slideUp 0.2s ease both' }}>
                    {(rb.steps || '').split('\n').filter(Boolean).map((step, si) => {
                      const num  = step.match(/^(\d+)\./)?.[1]
                      const text = step.replace(/^\d+\.\s*/, '')
                      return (
                        <div key={si} className="runbook-step" style={{ animationDelay: `${si*50}ms` }}>
                          <div className="step-num" style={{ borderColor: color, color }}>{num || si+1}</div>
                          <div style={{ fontSize: '0.8125rem', lineHeight: 1.7, fontFamily: 'var(--mono)' }}>{text}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}