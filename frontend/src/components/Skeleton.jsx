export function SkeletonStats() {
  return (
    <div className="stat-grid">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="stat-card" style={{ animationDelay: `${i*100}ms` }}>
          <div className="skeleton skeleton-text" style={{ width: '60%' }} />
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-text" style={{ width: '40%' }} />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div style={{ padding: '0.5rem 1rem' }}>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="skeleton skeleton-row"
          style={{ animationDelay: `${i*80}ms`, marginBottom: 6 }} />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return <div className="skeleton skeleton-card" />
}