// "El metro de la demanda": if Barcelona drew its metro only from this mobility data, which lines
// would it have? Demand between every pair of barrios is routed over a neighbourhood graph; the
// five corridors that carry the most trips become lines L1–L5 (in the colours of the real metro),
// and the barrios are rearranged into an octilinear, schematic metro map.
import { BARRIOS, N, DM, toLL } from '../model/geo.js'

// Colours of Barcelona's metro lines L1–L5 (the official logo and wordmarks are not used).
export const LINE_COLORS = ['#E1251B', '#9A3C96', '#2FA23A', '#F7B500', '#0B6FB8']
export const LINE_NAMES = ['L1', 'L2', 'L3', 'L4', 'L5']

const K_NEIGH = 4

function neighbourGraph() {
  const adj = Array.from({ length: N }, () => new Set())
  for (let i = 0; i < N; i++) {
    const near = [...Array(N).keys()].filter((j) => j !== i).sort((a, b) => DM[i * N + a] - DM[i * N + b]).slice(0, K_NEIGH)
    near.forEach((j) => { adj[i].add(j); adj[j].add(i) })
  }
  return adj.map((s) => [...s])
}

function shortestTree(adj, src) {
  const dist = new Float64Array(N).fill(Infinity)
  const prev = new Int16Array(N).fill(-1)
  const done = new Uint8Array(N)
  dist[src] = 0
  for (let it = 0; it < N; it++) {
    let u = -1
    for (let k = 0; k < N; k++) if (!done[k] && (u < 0 || dist[k] < dist[u])) u = k
    if (u < 0 || dist[u] === Infinity) break
    done[u] = 1
    for (const v of adj[u]) {
      const d = dist[u] + DM[u * N + v]
      if (d < dist[v]) { dist[v] = d; prev[v] = u }
    }
  }
  return prev
}
const pathFrom = (prev, src, dst) => {
  const p = [dst]
  while (p[0] !== src && prev[p[0]] >= 0) p.unshift(prev[p[0]])
  return p[0] === src ? p : null
}
const ek = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`)

// Lines: demand routed on the graph gives a load per edge; lines greedily follow the heaviest corridors.
export function buildMetro(ds) {
  const adj = neighbourGraph()
  const W = new Float64Array(N * N)
  for (let d = 0; d < ds.F.length; d++) for (let k = 0; k < N * N; k++) W[k] += ds.F[d][k] / ds.F.length
  const trees = Array.from({ length: N }, (_, i) => shortestTree(adj, i))
  const load = new Map()
  const paths = []
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const p = pathFrom(trees[i], i, j)
      if (!p) continue
      const v = W[i * N + j] + W[j * N + i]
      for (let k = 1; k < p.length; k++) { const e = ek(p[k - 1], p[k]); load.set(e, (load.get(e) || 0) + v) }
      if (DM[i * N + j] > 3.2 && p.length >= 6) paths.push(p)
    }
  }
  const used = new Map()
  const lines = []
  for (let l = 0; l < 5; l++) {
    let best = null
    let bestScore = 0
    for (const p of paths) {
      let sc = 0
      for (let k = 1; k < p.length; k++) {
        const e = ek(p[k - 1], p[k])
        sc += (load.get(e) || 0) * (used.has(e) ? 0.08 : 1)
      }
      // stations already served by other lines count less, so lines spread over the city
      const shared = p.filter((s) => lines.some((x) => x.stations.includes(s))).length / p.length
      sc *= 1 - 0.75 * shared
      if (sc > bestScore) { bestScore = sc; best = p }
    }
    if (!best) break
    for (let k = 1; k < best.length; k++) used.set(ek(best[k - 1], best[k]), true)
    let vol = 0
    for (let k = 1; k < best.length; k++) vol += load.get(ek(best[k - 1], best[k])) || 0
    lines.push({ stations: best, load: vol / (best.length - 1) })
  }
  lines.sort((a, b) => b.load - a.load)
  lines.forEach((ln, k) => { ln.id = k; ln.name = LINE_NAMES[k]; ln.color = LINE_COLORS[k] })
  const schem = schematize(lines)
  return { lines, schem, adj }
}

// Octilinear layout: every line segment is pulled towards the nearest multiple of 45° and a common
// length, stations push each other apart, and everything stays loosely anchored to its real place.
function schematize(lines) {
  const P = BARRIOS.map((b) => [...b.ck])
  const anchor = BARRIOS.map((b) => [...b.ck])
  const edges = new Map()
  lines.forEach((ln) => { for (let k = 1; k < ln.stations.length; k++) edges.set(ek(ln.stations[k - 1], ln.stations[k]), [ln.stations[k - 1], ln.stations[k]]) })
  const E = [...edges.values()]
  const onLine = new Set(lines.flatMap((l) => l.stations))
  const L = 1.05 // target segment length (km)
  for (let it = 0; it < 420; it++) {
    const F = P.map(() => [0, 0])
    for (const [a, b] of E) {
      const dx = P[b][0] - P[a][0]
      const dy = P[b][1] - P[a][1]
      const len = Math.hypot(dx, dy) || 1e-6
      const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4)
      const tx = Math.cos(ang) * L
      const ty = Math.sin(ang) * L
      const fx = (tx - dx) * 0.5
      const fy = (ty - dy) * 0.5
      F[a][0] -= fx; F[a][1] -= fy
      F[b][0] += fx; F[b][1] += fy
      void len
    }
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = P[j][0] - P[i][0]
        const dy = P[j][1] - P[i][1]
        const d = Math.hypot(dx, dy) || 1e-6
        const min = onLine.has(i) && onLine.has(j) ? 0.8 : 0.55
        if (d < min) {
          const f = ((min - d) / d) * 0.5
          F[i][0] -= dx * f; F[i][1] -= dy * f
          F[j][0] += dx * f; F[j][1] += dy * f
        }
      }
      const w = onLine.has(i) ? 0.02 : 0.12
      F[i][0] += (anchor[i][0] - P[i][0]) * w
      F[i][1] += (anchor[i][1] - P[i][1]) * w
    }
    const step = 0.35 * (1 - it / 520)
    for (let i = 0; i < N; i++) { P[i][0] += F[i][0] * step; P[i][1] += F[i][1] * step }
  }
  // snap to a 0.25 km grid so parallel segments line up
  const g = 0.25
  return P.map(([x, y]) => toLL(Math.round(x / g) * g, Math.round(y / g) * g))
}

// Position along a polyline at fraction u (0–1), by length.
export function along(path, u) {
  let total = 0
  const seg = []
  for (let k = 1; k < path.length; k++) { const l = Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1]); seg.push(l); total += l }
  let d = u * total
  for (let k = 0; k < seg.length; k++) {
    if (d <= seg[k] || k === seg.length - 1) {
      const f = seg[k] ? Math.min(1, d / seg[k]) : 0
      return [path[k][0] + (path[k + 1][0] - path[k][0]) * f, path[k][1] + (path[k + 1][1] - path[k][1]) * f]
    }
    d -= seg[k]
  }
  return path[path.length - 1]
}
