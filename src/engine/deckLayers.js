import { TripsLayer } from '@deck.gl/geo-layers'
import { ArcLayer, ScatterplotLayer, LineLayer, PathLayer, TextLayer } from '@deck.gl/layers'
import { BARRIOS, N, DM, toKm, toLL } from '../model/geo.js'
import { along } from './metro.js'
import { PERIOD } from './particles.js'
import { STEPS } from '../model/simulate.js'
import { DAYS, hexToRgb, mix } from '../lib/colors.js'
import { lerpArr, topFrom, topTo, stepOf } from '../model/derive.js'

const DAY_RGB = DAYS.map((d) => hexToRgb(d.hue))
const CHAMPAGNE = hexToRgb('#F1E3C2')

let seed = 9157
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }

// Animated "comets" between barrios: the strongest flows of every day of the week.
// Each day owns a 60-unit slot of animation time; the layer loops inside the current day's slot.
export function buildTrips(ds, elev) {
  seed = 9157
  const trips = []
  for (let t = 0; t < STEPS; t++) {
    const Ft = ds.F[t]
    const list = []
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (i !== j && Ft[i * N + j] > 0) list.push([Ft[i * N + j], i, j])
    if (!list.length) continue
    list.sort((a, b) => b[0] - a[0])
    const top = list.slice(0, 60)
    const vmax = top[0][0]
    const color = DAY_RGB[t]
    for (const [v, i, j] of top) {
      const n = 1 + Math.round((2.6 * v) / vmax)
      for (let m = 0; m < n; m++) {
        const start = t * 60 + rnd() * 52
        const dk = DM[i * N + j]
        const dur = 9 + dk * 3.4
        const side = (rnd() < 0.5 ? -1 : 1) * (0.18 + 0.22 * rnd())
        const p = BARRIOS[i].c
        const q = BARRIOS[j].c
        const mx = (p[0] + q[0]) / 2
        const my = (p[1] + q[1]) / 2
        const cx = mx - (q[1] - p[1]) * side
        const cy = my + (q[0] - p[0]) * side
        const path = []
        const ts = []
        for (let s = 0; s <= 12; s++) {
          const u = s / 12
          const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u
          const z = (elev[i] || 0) * (1 - u) + (elev[j] || 0) * u + Math.sin(Math.PI * u) * (40 + dk * 95) + 12
          path.push([a * p[0] + b * cx + c * q[0], a * p[1] + b * cy + c * q[1], z])
          ts.push(start + dur * u)
        }
        trips.push({ path, ts, color, w: 1.2 + (2.4 * v) / vmax })
      }
    }
  }
  return trips
}

export function buildDeckLayers({ s, trips, elev, now, zoom, grow, metro, metroT = 0, particles, partT = 0 }) {
  const out = []
  if (s.intro !== 'done') return out
  const { t, layers, dataset: ds, sel, colorMode, influenceDir } = s
  const day = stepOf(t)
  const tod = (now / 1000) % 1000

  if (partT > 0.01 && particles?.trips.length) {
    out.push(new TripsLayer({
      id: 'particles',
      data: particles.trips,
      getPath: (d) => d.path,
      getTimestamps: (d) => d.ts,
      getColor: (d) => d.color,
      getWidth: 2.2,
      widthUnits: 'pixels',
      widthMinPixels: 1.6,
      capRounded: true,
      jointRounded: true,
      fadeTrail: true,
      trailLength: 1.1,
      currentTime: ((now / 1000) * 1.7) % PERIOD,
      opacity: partT,
      parameters: { depthCompare: 'always', blend: true, blendColorOperation: 'add', blendColorSrcFactor: 'src-alpha', blendColorDstFactor: 'one', blendAlphaOperation: 'add', blendAlphaSrcFactor: 'one', blendAlphaDstFactor: 'one' },
    }))
  }
  if (metroT > 0.01 && metro) {
    out.push(...metroLayers({ s, metro, metroT, now, zoom, day }))
  }
  if (metroT > 0.5 || partT > 0.5) return out

  if (layers.flows && trips) {
    const currentTime = day * 60 + ((tod * 9) % 60)
    out.push(new TripsLayer({
      id: 'trips',
      data: trips,
      getPath: (d) => d.path,
      getTimestamps: (d) => d.ts,
      getColor: (d) => d.color,
      getWidth: (d) => d.w,
      widthUnits: 'pixels',
      widthMinPixels: 1.4,
      jointRounded: true,
      capRounded: true,
      fadeTrail: true,
      trailLength: 24,
      currentTime,
      opacity: sel >= 0 ? 0.28 : 0.9,
    }))
  }

  if (sel >= 0 && layers.arcs) {
    const list = (colorMode === 'influence' && influenceDir === 'in' ? topTo(ds, sel, t, 10) : topFrom(ds, sel, t, 10)).filter((o) => o.v > 0)
    const incoming = colorMode === 'influence' && influenceDir === 'in'
    const vmax = list[0]?.v || 1
    const hue = DAY_RGB[day]
    out.push(new ArcLayer({
      id: 'arcs',
      data: list,
      getSourcePosition: (o) => (incoming ? [...BARRIOS[o.j].c, elev[o.j] || 0] : [...BARRIOS[sel].c, elev[sel] || 0]),
      getTargetPosition: (o) => (incoming ? [...BARRIOS[sel].c, elev[sel] || 0] : [...BARRIOS[o.j].c, elev[o.j] || 0]),
      getSourceColor: [...(incoming ? hue : CHAMPAGNE), 235],
      getTargetColor: [...(incoming ? CHAMPAGNE : hue), 235],
      getWidth: (o) => 1.5 + 7 * Math.sqrt(o.v / vmax) * grow,
      getHeight: 0.5,
      widthUnits: 'pixels',
      updateTriggers: { getWidth: [day, grow], getSourcePosition: [sel, incoming], getTargetPosition: [sel, incoming], getSourceColor: [day, incoming], getTargetColor: [day, incoming] },
      transitions: { getWidth: 300 },
    }))
  }

  if (layers.bubbles) {
    const m = ds.metrics
    const hue = DAY_RGB[day]
    const data = BARRIOS.map((b) => {
      const v = m[b.i].bub[day]
      return { i: b.i, c: b.c, v, z: (elev[b.i] || 0) + 160 + v * 2400 * grow + Math.sin(tod * 1.1 + b.i) * 45, r: 6 + 20 * Math.sqrt(ds.pop[b.i] / 58) }
    })
    out.push(new LineLayer({
      id: 'bubble-strings',
      data,
      getSourcePosition: (o) => [o.c[0], o.c[1], elev[o.i] || 0],
      getTargetPosition: (o) => [o.c[0], o.c[1], o.z],
      getColor: [255, 255, 255, 90],
      getWidth: 1,
      widthUnits: 'pixels',
      updateTriggers: { getTargetPosition: tod },
    }))
    out.push(new ScatterplotLayer({
      id: 'bubble-shell',
      data,
      getPosition: (o) => [o.c[0], o.c[1], o.z],
      getRadius: (o) => o.r,
      radiusUnits: 'pixels',
      billboard: true,
      stroked: true,
      filled: true,
      getFillColor: (o) => [...mix(CHAMPAGNE, hue, 0.3), o.i === sel ? 90 : 34],
      getLineColor: (o) => (o.i === sel ? [255, 255, 255, 255] : [255, 255, 255, 200]),
      lineWidthMinPixels: 1.2,
      updateTriggers: { getPosition: tod, getFillColor: [day, sel], getLineColor: sel },
    }))
    out.push(new ScatterplotLayer({
      id: 'bubble-core',
      data,
      getPosition: (o) => [o.c[0], o.c[1], o.z],
      getRadius: (o) => o.r * Math.sqrt(Math.max(0.02, o.v)),
      radiusUnits: 'pixels',
      billboard: true,
      getFillColor: [...hue, 225],
      updateTriggers: { getPosition: tod, getRadius: day, getFillColor: day },
    }))
  }

  if (layers.pulse && zoom > 10.5) {
    const arr = lerpArr(ds.ARR, t)
    const top = [...arr.keys()].sort((a, b) => arr[b] - arr[a]).slice(0, 3)
    const rings = []
    top.forEach((i, k) => {
      for (let m = 0; m < 2; m++) {
        const ph = ((tod * 0.42) + k * 0.21 + m * 0.5) % 1
        rings.push({ c: [...BARRIOS[i].c, (elev[i] || 0) + 4], r: 220 + ph * 1300, a: 1 - ph })
      }
    })
    out.push(new ScatterplotLayer({
      id: 'pulse',
      data: rings,
      getPosition: (d) => d.c,
      getRadius: (d) => d.r,
      stroked: true,
      filled: false,
      getLineColor: (d) => [...CHAMPAGNE, Math.round(170 * d.a * d.a)],
      lineWidthMinPixels: 1.5,
      updateTriggers: { getRadius: tod, getLineColor: tod },
      parameters: { depthCompare: 'always' },
    }))
  }
  return out
}

/* ------------------------------------------------------------------ metro map */
const smooth = (x) => x * x * (3 - 2 * x)
const lerp2 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]
const hex = (h) => hexToRgb(h)

function metroLayers({ s, metro, metroT, now, zoom, day }) {
  const k = smooth(Math.min(1, metroT))
  const pos = BARRIOS.map((b, i) => lerp2(b.c, metro.schem[i], k))
  const posKm = pos.map((p) => toKm(p[0], p[1]))
  // parallel lines on a shared segment are drawn side by side, 8 px apart
  const kmPerPx = (156543.03 * Math.cos((41.4 * Math.PI) / 180)) / 2 ** zoom / 1000
  const gap = 8 * kmPerPx
  const share = new Map()
  metro.lines.forEach((ln) => { for (let q = 1; q < ln.stations.length; q++) { const a = ln.stations[q - 1], b = ln.stations[q]; const key = a < b ? `${a}-${b}` : `${b}-${a}`; if (!share.has(key)) share.set(key, []); share.get(key).push(ln.id) } })
  const shifted = metro.lines.map((ln) => {
    const st = ln.stations
    return st.map((i, q) => {
      let nx = 0, ny = 0, c = 0
      for (const [a, b] of [[st[q - 1], i], [i, st[q + 1]]]) {
        if (a == null || b == null) continue
        const key = a < b ? `${a}-${b}` : `${b}-${a}`
        const list = share.get(key)
        const r = list.indexOf(ln.id) - (list.length - 1) / 2
        const dx = posKm[b][0] - posKm[a][0], dy = posKm[b][1] - posKm[a][1]
        const len = Math.hypot(dx, dy) || 1
        // normal of the segment, oriented the same way for both directions of travel
        const sgn = a < b ? 1 : -1
        nx += (-dy / len) * r * gap * sgn
        ny += (dx / len) * r * gap * sgn
        c++
      }
      return toLL(posKm[i][0] + nx / (c || 1), posKm[i][1] + ny / (c || 1))
    })
  })
  const focus = s.metroFocus ?? -1
  const alphaOf = (id) => Math.round(255 * Math.min(1, metroT * 1.4) * (focus < 0 || focus === id ? 1 : 0.18))
  const onLine = new Map()
  metro.lines.forEach((ln) => ln.stations.forEach((i) => onLine.set(i, (onLine.get(i) || 0) + 1)))
  const lineData = metro.lines.map((ln, q) => ({ ln, path: shifted[q] }))
  const A = Math.round(255 * Math.min(1, metroT * 1.4))
  const P = { depthCompare: 'always' }
  const out = []
  out.push(new ScatterplotLayer({
    id: 'metro-minor',
    data: BARRIOS.filter((b) => !onLine.has(b.i)),
    getPosition: (b) => pos[b.i],
    getRadius: 2.6,
    radiusUnits: 'pixels',
    getFillColor: [150, 156, 164, Math.round(A * 0.7)],
    updateTriggers: { getPosition: k, getFillColor: A },
    parameters: P,
  }))
  out.push(new PathLayer({
    id: 'metro-casing',
    data: lineData,
    getPath: (d) => d.path,
    getColor: [14, 16, 18, A],
    getWidth: 11,
    widthUnits: 'pixels',
    jointRounded: true,
    capRounded: true,
    updateTriggers: { getPath: [k, zoom], getColor: A },
    parameters: P,
  }))
  out.push(new PathLayer({
    id: 'metro-lines',
    data: lineData,
    getPath: (d) => d.path,
    getColor: (d) => [...hex(d.ln.color), alphaOf(d.ln.id)],
    getWidth: 7,
    widthUnits: 'pixels',
    jointRounded: true,
    capRounded: true,
    pickable: true,
    updateTriggers: { getPath: [k, zoom], getColor: [A, focus] },
    parameters: P,
  }))
  // trains: more of them on the busiest lines and days
  const meanMov = s.dataset.MOV.reduce((a, b) => a + b, 0) / s.dataset.MOV.length || 1
  const dayK = s.dataset.MOV[day] / meanMov
  const maxLoad = metro.lines[0]?.load || 1
  const trains = []
  lineData.forEach(({ ln, path }) => {
    const n = Math.max(2, Math.round((3 + 7 * (ln.load / maxLoad)) * dayK))
    const speed = 0.018
    for (let m = 0; m < n; m++) {
      for (const dir of [1, -1]) {
        let u = ((now / 1000) * speed + m / n + (dir < 0 ? 0.5 / n : 0)) % 1
        if (dir < 0) u = 1 - u
        trains.push({ p: along(path, u), c: hex(ln.color), id: ln.id })
      }
    }
  })
  out.push(new ScatterplotLayer({
    id: 'metro-trains',
    data: trains,
    getPosition: (d) => d.p,
    getRadius: 4.2,
    radiusUnits: 'pixels',
    stroked: true,
    getFillColor: (d) => [255, 255, 255, focus < 0 || focus === d.id ? A : Math.round(A * 0.15)],
    getLineColor: (d) => [...d.c, focus < 0 || focus === d.id ? A : Math.round(A * 0.15)],
    lineWidthMinPixels: 2,
    updateTriggers: { getPosition: now, getFillColor: [A, focus], getLineColor: [A, focus] },
    parameters: P,
  }))
  const stations = [...onLine.keys()]
  out.push(new ScatterplotLayer({
    id: 'metro-stations',
    data: stations,
    getPosition: (i) => pos[i],
    getRadius: (i) => (onLine.get(i) > 1 ? 7.5 : 5),
    radiusUnits: 'pixels',
    stroked: true,
    getFillColor: [255, 255, 255, A],
    getLineColor: [14, 16, 18, A],
    lineWidthMinPixels: 2.5,
    pickable: true,
    updateTriggers: { getPosition: k, getFillColor: A, getLineColor: A },
    parameters: P,
  }))
  if (metroT > 0.55) {
    const la = Math.round(255 * Math.min(1, (metroT - 0.55) / 0.45))
    out.push(new TextLayer({
      id: 'metro-labels',
      data: stations,
      getPosition: (i) => pos[i],
      getText: (i) => BARRIOS[i].short,
      getSize: (i) => (onLine.get(i) > 1 ? 13 : 11.5),
      getColor: [255, 255, 255, la],
      getPixelOffset: [12, 0],
      getTextAnchor: 'start',
      getAlignmentBaseline: 'center',
      fontFamily: '"Archivo Variable", "Helvetica Neue", Arial, sans-serif',
      fontWeight: 700,
      characterSet: 'auto',
      fontSettings: { sdf: true, fontSize: 48, buffer: 6 },
      outlineWidth: 4,
      outlineColor: [14, 16, 18, la],
      updateTriggers: { getPosition: k, getColor: la, getSize: 0 },
      parameters: P,
    }))
    // line roundels at both ends of every line
    const ends = []
    lineData.forEach(({ ln, path }) => {
      for (const [a, b] of [[path[1], path[0]], [path[path.length - 2], path[path.length - 1]]]) {
        const ka = toKm(a[0], a[1]), kb = toKm(b[0], b[1])
        const len = Math.hypot(kb[0] - ka[0], kb[1] - ka[1]) || 1
        const off = 22 * kmPerPx
        ends.push({ p: toLL(kb[0] + ((kb[0] - ka[0]) / len) * off, kb[1] + ((kb[1] - ka[1]) / len) * off), ln })
      }
    })
    out.push(new ScatterplotLayer({
      id: 'metro-roundels',
      data: ends,
      getPosition: (d) => d.p,
      getRadius: 12,
      radiusUnits: 'pixels',
      stroked: true,
      getFillColor: (d) => [...hex(d.ln.color), la],
      getLineColor: [255, 255, 255, la],
      lineWidthMinPixels: 2,
      updateTriggers: { getPosition: [k, zoom], getFillColor: la, getLineColor: la },
      parameters: P,
    }))
    out.push(new TextLayer({
      id: 'metro-roundel-text',
      data: ends,
      getPosition: (d) => d.p,
      getText: (d) => d.ln.name,
      getSize: 11,
      getColor: (d) => (d.ln.name === 'L4' ? [20, 20, 20, la] : [255, 255, 255, la]),
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      fontFamily: '"Archivo Variable", "Helvetica Neue", Arial, sans-serif',
      fontWeight: 800,
      updateTriggers: { getPosition: [k, zoom], getColor: la },
      parameters: P,
    }))
  }
  return out
}
