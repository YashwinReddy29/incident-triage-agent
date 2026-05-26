import { Routes, Route, NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Dashboard  from './pages/Dashboard'
import LiveTriage from './pages/LiveTriage'
import SnowSync   from './pages/SnowSync'
import Runbooks   from './pages/Runbooks'
import { ToastContainer } from './components/Toast'
import { testConnection } from './api'

const NAV = [
  { path: '/',         icon: '▦', label: 'Dashboard'   },
  { path: '/triage',   icon: '⚡', label: 'Live Triage' },
  { path: '/sync',     icon: '↻', label: 'ServiceNow'  },
  { path: '/runbooks', icon: '☰', label: 'Runbooks'    },
]

export default function App() {
  const [connected, setConnected] = useState(null)

  useEffect(() => {
    testConnection()
      .then(r => setConnected(r.data.connected))
      .catch(() => setConnected(false))
  }, [])

  return (
    <div className="layout">
      <aside className="sidebar">
        <div style={{ marginBottom: '2rem' }}>
          <div className="sidebar-logo">Triage AI</div>
          <div className="sidebar-sub">INCIDENT OPERATIONS CENTER</div>
        </div>

        <nav style={{ flex: 1 }}>
          {NAV.map(n => (
            <NavLink key={n.path} to={n.path} end={n.path === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: connected === null ? 'var(--muted)' : connected ? 'var(--p4)' : 'var(--p1)',
              boxShadow: `0 0 8px ${connected ? 'var(--p4)' : 'var(--p1)'}`,
              animation: connected ? 'p4pulse 2s infinite' : 'none',
            }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
              {connected === null ? 'Connecting...' : connected ? 'ServiceNow Live' : 'Disconnected'}
            </span>
          </div>
        </div>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/"         element={<Dashboard />}  />
          <Route path="/triage"   element={<LiveTriage />} />
          <Route path="/sync"     element={<SnowSync />}   />
          <Route path="/runbooks" element={<Runbooks />}   />
        </Routes>
      </main>

      <ToastContainer />
    </div>
  )
}