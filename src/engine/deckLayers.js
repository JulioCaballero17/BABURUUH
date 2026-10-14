import { TripsLayer } from '@deck.gl/geo-layers'
import { ArcLayer, ScatterplotLayer, LineLayer } from '@deck.gl/layers'
import { BARRIOS, N, DM } from '../model/geo.js'
import { HOURS } from '../model/simulate.js'
import { DAYS, hexToRgb, mix } from '../lib/colors.js'
import { lerpArr, topFrom, topTo } from '../model/derive.js'

const DAY_RGB = DAYS.map((d) => hexToRgb(d.hue))
const CHAMPAGNE = hexToRgb('#F1E3C2')

let seed = 9157
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }

// Animated "comets" between barrios: the strongest flows of every hour of the week.
export function buildTrips(ds, elev) {
  seed = 9157
  const trips = []
  for (let t = 0; t < HOURS; t++) {
    const Ft = ds.F[t]
    const list = []
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (i !== j && Ft[i * N + j] > 0) list.push([Ft[i * N + j], i, j])
    if (!list.length) continue
    list.sort((a, b) => b[0] - a[0])
    const top = list.slice(0, 38)
    const vmax = top[0][0]
    const color = DAY_RGB[Math.floor(t / 24)]
    for (const [v, i, j] of top) {
      const n = 1 + Math.round((2.6 * v) / vmax)
      for (let m = 0; m < n; m++) {
        const start = t * 60 + rnd() * 60
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

export function buildDeckLayers({ s, trips, elev, now, zoom, grow }) {
  const out = []
  if (s.intro !== 'done') return out
  const { t, layers, dataset: ds, sel, colorMode, influenceDir } = s
  const day = Math.floor(t / 24)
  const tod = (now / 1000) % 1000

  if (layers.flows && trips) {
    const currentTime = s.playing || s.tween ? t * 60 : Math.floor(t) * 60 + ((tod * 11) % 60)
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
      updateTriggers: { getWidth: [Math.round(t * 4), grow], getSourcePosition: [sel, incoming], getTargetPosition: [sel, incoming], getSourceColor: [day, incoming], getTargetColor: [day, incoming] },
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
