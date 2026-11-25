// "Barcelona en movimiento": thousands of points of light, each one a bundle of real trips,
// travelling from their origin barrio to their destination on the chosen day.
// Colour = traveller type (residents, rest of Catalonia, rest of Spain, abroad).
import { BARRIOS, N, DM, toLL } from '../model/geo.js'
import { hexToRgb } from '../lib/colors.js'

export const PERIOD = 60 // animation loop length (seconds of animation time)
export const PARTICLE_COLORS = {
  Residente: '#FFC72C',
  Regional: '#46D4C0',
  Nacional: '#FF8A3D',
  Internacional: '#FF4FA3',
  all: '#FFC72C',
}
const RGB = Object.fromEntries(Object.entries(PARTICLE_COLORS).map(([k, v]) => [k, hexToRgb(v)]))

let seed = 1
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
const gauss = () => { const u = rnd() || 1e-9; const v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }

// flows: { [segment]: Float32Array|number[] (N*N) } for one day
export function buildParticles(flows, count) {
  seed = 4242
  const names = Object.keys(flows)
  const W = new Float64Array(names.length * N * N)
  let tot = 0
  names.forEach((n, s) => {
    const M = flows[n]
    for (let k = 0; k < N * N; k++) {
      const i = Math.floor(k / N)
      const v = i === k % N ? 0 : M[k] || 0
      tot += v
      W[s * N * N + k] = tot
    }
  })
  if (!tot) return { trips: [], perDot: 0, total: 0 }
  const out = []
  for (let m = 0; m < count; m++) {
    const r = rnd() * tot
    let lo = 0
    let hi = W.length - 1
    while (lo < hi) { const mid = (lo + hi) >> 1; if (W[mid] < r) lo = mid + 1; else hi = mid }
    const s = Math.floor(lo / (N * N))
    const k = lo % (N * N)
    const i = Math.floor(k / N)
    const j = k % N
    const spread = (b) => 0.32 * Math.sqrt(BARRIOS[b].area)
    const p = [BARRIOS[i].ck[0] + gauss() * spread(i), BARRIOS[i].ck[1] + gauss() * spread(i)]
    const q = [BARRIOS[j].ck[0] + gauss() * spread(j), BARRIOS[j].ck[1] + gauss() * spread(j)]
    const dk = DM[i * N + j]
    const bend = (rnd() - 0.5) * 0.5
    const cx = (p[0] + q[0]) / 2 - (q[1] - p[1]) * bend
    const cy = (p[1] + q[1]) / 2 + (q[0] - p[0]) * bend
    const dur = 5 + dk * 1.6 + rnd() * 2
    const start = rnd() * PERIOD
    const path = []
    const ts = []
    for (let u = 0; u <= 6; u++) {
      const f = u / 6
      const a = (1 - f) * (1 - f), b = 2 * (1 - f) * f, c = f * f
      path.push([...toLL(a * p[0] + b * cx + c * q[0], a * p[1] + b * cy + c * q[1]), 20 + Math.sin(Math.PI * f) * (30 + dk * 60)])
      ts.push(start + dur * f)
    }
    const color = RGB[names[s]] || RGB.all
    out.push({ path, ts, color })
    if (start + dur > PERIOD) out.push({ path, ts: ts.map((x) => x - PERIOD), color }) // wrap around the loop
  }
  return { trips: out, perDot: tot / count, total: tot, segments: names }
}
