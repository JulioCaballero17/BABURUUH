export const fmt = (n) => Math.round(n || 0).toLocaleString('es-ES')
export const fmtK = (n) => (n >= 1000 ? `${(n / 1000).toLocaleString('es-ES', { maximumFractionDigits: n >= 100000 ? 0 : 1 })} k` : fmt(n))
export const pct = (v, digits = 0) => `${(v * 100).toLocaleString('es-ES', { maximumFractionDigits: digits })} %`
export const signedPct = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(Math.round(v * 100))} %`
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))
export const smoothstep = (x) => { const t = clamp(x); return t * t * (3 - 2 * t) }
export const easeInOutCubic = (e) => (e < 0.5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2)
export const hourLabel = (h) => `${String(h).padStart(2, '0')}:00`
