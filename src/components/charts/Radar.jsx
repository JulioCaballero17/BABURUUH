import { motion } from 'framer-motion'

// axes: [{label, v (0–1), ref (0–1)}]
export default function Radar({ axes, color = 'var(--day)', size = 200 }) {
  const c = size / 2
  const R = c - 34
  const n = axes.length
  const P = (k, r) => {
    const a = (k / n) * Math.PI * 2 - Math.PI / 2
    return [c + r * Math.cos(a), c + r * Math.sin(a)]
  }
  const poly = (vals) => vals.map((v, k) => P(k, R * Math.max(0.04, Math.min(1, v))).map((x) => x.toFixed(1)).join(',')).join(' ')
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`Perfil del barrio: ${axes.map((a) => `${a.label} ${Math.round(a.v * 100)}`).join(', ')}`} style={{ overflow: 'visible' }}>
      {[0.33, 0.66, 1].map((q) => (
        <polygon key={q} points={axes.map((_, k) => P(k, R * q).join(',')).join(' ')} fill="none" stroke="var(--glass-border)" />
      ))}
      {axes.map((a, k) => {
        const [x, y] = P(k, R)
        const [lx, ly] = P(k, R + 16)
        return (
          <g key={a.label}>
            <line x1={c} y1={c} x2={x} y2={y} stroke="var(--glass-border)" />
            <text x={lx} y={ly + 3} textAnchor="middle" style={{ fontSize: 10, fill: 'var(--ink-2)', fontWeight: 550 }}>{a.label}</text>
          </g>
        )
      })}
      <polygon points={poly(axes.map((a) => a.ref))} fill="none" stroke="var(--ink-3)" strokeDasharray="3 3" />
      <motion.polygon initial={false} animate={{ points: poly(axes.map((a) => a.v)) }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} fill={color} fillOpacity="0.28" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}
