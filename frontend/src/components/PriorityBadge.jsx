const P = {
  1: { cls: 'badge-p1', icon: '●', label: 'P1 CRITICAL' },
  2: { cls: 'badge-p2', icon: '●', label: 'P2 HIGH'     },
  3: { cls: 'badge-p3', icon: '●', label: 'P3 MEDIUM'   },
  4: { cls: 'badge-p4', icon: '●', label: 'P4 LOW'      },
}

export default function PriorityBadge({ priority, large = false }) {
  const p = P[priority] || P[3]
  return (
    <span className={`badge ${p.cls} ${large ? 'badge-large' : ''}`}>
      {p.icon} {p.label}
    </span>
  )
}