import { useEffect, useState } from 'react'

export default function StatCard({ label, value, sub, color, delay = 0, extra = '' }) {
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    const str    = String(value)
    const num    = parseFloat(str.replace(/[^0-9.]/g, '')) || 0
    const suffix = str.replace(/[0-9.]/g, '')
    let step = 0
    const steps = 40
    const timer = setInterval(() => {
      step++
      const v = Math.min((num / steps) * step, num)
      setDisplay((Number.isInteger(num) ? Math.floor(v) : v.toFixed(1)) + suffix)
      if (step >= steps) clearInterval(timer)
    }, 25)
    return () => clearInterval(timer)
  }, [value])

  return (
    <div className={`stat-card ${extra}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: color || 'var(--text)' }}>{display}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}