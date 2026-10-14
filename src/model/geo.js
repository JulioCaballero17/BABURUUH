import RAW from '../data/barris.json'
import { POP, LEI, WRK, SHORT, DISTRICTS } from '../data/attributes.js'

// Local planar projection (km) around Barcelona, accurate enough for areas and distances.
const LAT0 = 41.4
const LON0 = 2.16
const KX = Math.cos((LAT0 * Math.PI) / 180) * 111.32
const KY = 110.57
export const toKm = (lon, lat) => [(lon - LON0) * KX, (lat - LAT0) * KY]
export const toLL = (x, y) => [x / KX + LON0, y / KY + LAT0]

export const hash = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export const BARRIOS = RAW.map((r, i) => {
  const ringsKm = r.r.map((ring) => ring.map((p) => toKm(p[0], p[1])))
  let A = 0
  let cx = 0
  let cy = 0
  ringsKm.forEach((ring) => {
    for (let k = 0; k < ring.length - 1; k++) {
      const [x1, y1] = ring[k]
      const [x2, y2] = ring[k + 1]
      const f = x1 * y2 - x2 * y1
      A += f
      cx += (x1 + x2) * f
      cy += (y1 + y2) * f
    }
  })
  A /= 2
  const ck = [cx / (6 * A), cy / (6 * A)]
  let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity
  r.r.forEach((ring) => ring.forEach(([x, y]) => { mnx = Math.min(mnx, x); mny = Math.min(mny, y); mxx = Math.max(mxx, x); mxy = Math.max(mxy, y) }))
  return {
    i,
    code: r.b,
    name: titleCase(r.n),
    short: SHORT[i] || titleCase(r.n),
    dist: r.d,
    district: DISTRICTS[r.d],
    rings: r.r,
    ringsKm,
    ck,
    c: toLL(ck[0], ck[1]),
    bbox: [mnx, mny, mxx, mxy],
    area: Math.abs(A),
    pop: POP[i],
    lei: LEI[i],
    wrk: WRK[i],
    // Simulated restaurant density (per 1,000 residents). Replace with Open Data BCN counts via the Datos panel.
    rest: +(1.5 + 13 * LEI[i] + 3 * WRK[i] + 2.5 * hash(i)).toFixed(1),
  }
})
export const N = BARRIOS.length

export const CITY_BBOX = (() => {
  let a = [Infinity, Infinity, -Infinity, -Infinity]
  BARRIOS.forEach((b) => { a = [Math.min(a[0], b.bbox[0]), Math.min(a[1], b.bbox[1]), Math.max(a[2], b.bbox[2]), Math.max(a[3], b.bbox[3])] })
  return a
})()

export const BARRIOS_GEOJSON = {
  type: 'FeatureCollection',
  features: BARRIOS.map((b) => ({
    type: 'Feature',
    id: b.i,
    properties: { i: b.i, name: b.name, short: b.short, dist: b.dist },
    geometry: { type: 'MultiPolygon', coordinates: b.rings.map((r) => [r]) },
  })),
}

export const LABELS_GEOJSON = {
  type: 'FeatureCollection',
  features: BARRIOS.map((b) => ({
    type: 'Feature',
    id: b.i,
    properties: { i: b.i, short: b.short, rank: b.pop },
    geometry: { type: 'Point', coordinates: b.c },
  })),
}

function inRing(x, y, ring) {
  let ins = false
  for (let a = 0, b = ring.length - 1; a < ring.length; b = a++) {
    const [xi, yi] = ring[a]
    const [xj, yj] = ring[b]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins
  }
  return ins
}
export const barrioAtKm = (x, y) => {
  for (const b of BARRIOS) for (const r of b.ringsKm) if (inRing(x, y, r)) return b.i
  return -1
}

// Hexagonal grid (pointy-top, ~300 m radius) clipped to the city.
export const HEX_R = 0.3
export const HEXES = (() => {
  const out = []
  const kmBox = [toKm(CITY_BBOX[0], CITY_BBOX[1]), toKm(CITY_BBOX[2], CITY_BBOX[3])]
  const dx = Math.sqrt(3) * HEX_R
  const dy = 1.5 * HEX_R
  let row = 0
  for (let y = kmBox[0][1]; y <= kmBox[1][1] + dy; y += dy, row++) {
    for (let x = kmBox[0][0] - (row % 2 ? dx / 2 : 0); x <= kmBox[1][0] + dx; x += dx) {
      const b = barrioAtKm(x, y)
      if (b < 0) continue
      const k = out.length
      const ring = []
      for (let s = 0; s <= 6; s++) {
        const a = (Math.PI / 180) * (60 * (s % 6) - 90)
        ring.push(toLL(x + HEX_R * 0.93 * Math.cos(a), y + HEX_R * 0.93 * Math.sin(a)))
      }
      const weights = []
      BARRIOS.forEach((o) => {
        const d = Math.hypot(x - o.ck[0], y - o.ck[1])
        if (d < 2.4) weights.push([o.i, Math.exp(-(d * d) / (2 * 0.65 * 0.65))])
      })
      out.push({ k, b, x, y, c: toLL(x, y), ring, weights, noise: hash(k + 7) })
    }
  }
  return out
})()

export const HEX_GEOJSON = {
  type: 'FeatureCollection',
  features: HEXES.map((h) => ({ type: 'Feature', id: h.k, properties: { k: h.k, b: h.b }, geometry: { type: 'Polygon', coordinates: [h.ring] } })),
}

// Distance matrix between barrio centroids (km)
export const DM = (() => {
  const m = new Float32Array(N * N)
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) m[i * N + j] = Math.hypot(BARRIOS[i].ck[0] - BARRIOS[j].ck[0], BARRIOS[i].ck[1] - BARRIOS[j].ck[1])
  return m
})()

// ---- name matching for imported data ----
export const normalizeName = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/l·l/g, 'll')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\b(el|la|els|les|l|de|del|d|i|y)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const NAME_INDEX = (() => {
  const m = new Map()
  BARRIOS.forEach((b) => {
    m.set(normalizeName(b.name), b.i)
    m.set(normalizeName(b.short), b.i)
  })
  return m
})()

export function matchBarrio(value) {
  if (value == null || value === '') return -1
  const n = Number(value)
  if (Number.isInteger(n) && n >= 1 && n <= N && String(value).trim().match(/^\d+$/)) return n - 1
  const key = normalizeName(value)
  if (NAME_INDEX.has(key)) return NAME_INDEX.get(key)
  // loose match: every word of the shorter name appears in the longer one
  let best = -1
  let bestScore = 0
  for (const [k, i] of NAME_INDEX) {
    const a = key.split(' ')
    const b = k.split(' ')
    const hits = a.filter((w) => w.length > 2 && b.includes(w)).length
    const score = hits / Math.max(a.length, b.length)
    if (score > bestScore) { bestScore = score; best = i }
  }
  return bestScore >= 0.5 ? best : -1
}
