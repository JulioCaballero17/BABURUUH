import { BARRIOS } from '../model/geo.js'

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }

// Six normalised traits per barrio (0–1) plus the city median as reference.
export function dnaAxes(ds, i) {
  const M = ds.metrics
  const norm = (vals, v) => { const mx = Math.max(...vals); const mn = Math.min(...vals); return mx > mn ? (v - mn) / (mx - mn) : 0 }
  const traits = [
    ['Atracción', M.map((m) => m.weekArr / (BARRIOS[m.i].area + 0.3))],
    ['Noche', M.map((m) => m.nightRatio)],
    ['Burbuja', M.map((m) => m.bubAvg)],
    ['Efecto viernes', M.map((m) => m.friE)],
    ['Restaurantes', ds.rest],
    ['Madrugadores', M.map((m) => (m.mornOut + 1) / (m.mornIn + 1))],
  ]
  return traits.map(([label, vals]) => {
    const scaled = vals.map((v) => norm(vals, v))
    return { label, v: Math.sqrt(scaled[i]), ref: Math.sqrt(median(scaled)) }
  })
}
