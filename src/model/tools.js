// The three tools of Baburu, computed only from Telefónica's mobility data (plus resident population).
//   · Dónde abrir — which barrio suits a type of business, and why
//   · Simulador   — what happens to the flows if something changes (an event, a closure, more remote work)
//   · Turismo     — where visitors go, and when
import { BARRIOS, N, DM } from './geo.js'
import { STEPS } from './simulate.js'

const WEEK = [0, 1, 2, 3, 4]
// percentile rank 0..1 (robust to outliers, comparable between indicators)
function rank(values, mask) {
  const idx = [...values.keys()].filter((i) => !mask || mask[i])
  const sorted = idx.map((i) => values[i]).sort((a, b) => a - b)
  const out = new Float32Array(values.length)
  for (const i of idx) {
    let lo = 0
    let hi = sorted.length
    while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < values[i]) lo = m + 1; else hi = m }
    out[i] = sorted.length > 1 ? lo / (sorted.length - 1) : 0.5
  }
  return out
}

// Average weekday arrivals per barrio for a set of traveller types (falls back to all arrivals).
function arrivalsOf(ds, names) {
  const out = new Float32Array(N)
  if (!ds.segArr) { for (const d of WEEK) for (let i = 0; i < N; i++) out[i] += ds.ARR[d][i] / STEPS; return out }
  for (const n of names) if (ds.segArr[n]) for (const d of WEEK) for (let i = 0; i < N; i++) out[i] += ds.segArr[n][d][i] / STEPS
  return out
}

/* ------------------------------------------------------------------ Dónde abrir */
export const BUSINESSES = [
  {
    key: 'ocio',
    label: 'Restauración y ocio',
    short: 'Bares y restaurantes',
    desc: 'Donde llega mucha gente por km² y el viernes se anima.',
    parts: [['dens', 0.55, 'llega mucha gente por km²'], ['fri', 0.25, 'el viernes gana movimiento'], ['vis', 0.2, 'atrae a gente de fuera']],
  },
  {
    key: 'turista',
    label: 'Tienda para turistas',
    short: 'Souvenirs, alquiler, tours',
    desc: 'Donde se concentran los visitantes de fuera de Barcelona.',
    parts: [['tour', 0.6, 'muchos visitantes de fuera'], ['intl', 0.3, 'mucho visitante extranjero'], ['dens', 0.1, 'zona muy concurrida']],
  },
  {
    key: 'trabajo',
    label: 'Servicios para quien trabaja',
    short: 'Cafés de oficina, gimnasios, comida para llevar',
    desc: 'Donde llega mucha más gente de la que vive, de lunes a jueves.',
    parts: [['magnet', 0.6, 'recibe mucha más gente de la que vive'], ['weekday', 0.25, 'actividad estable entre semana'], ['dens', 0.15, 'llega mucha gente por km²']],
  },
  {
    key: 'barrio',
    label: 'Comercio de barrio',
    short: 'Panadería, farmacia, súper',
    desc: 'Donde vive mucha gente que hace su vida en el barrio.',
    parts: [['pop', 0.5, 'mucha población residente'], ['local', 0.35, 'sus vecinos salen poco'], ['res', 0.15, 'llegan sobre todo residentes']],
  },
]

export function siteScores(ds, key) {
  const b = BUSINESSES.find((x) => x.key === key) || BUSINESSES[0]
  const pop = ds.pop
  const mask = BARRIOS.map((x) => pop[x.i] >= 1)
  const arr = arrivalsOf(ds, ['Residente', 'Regional', 'Nacional', 'Internacional'])
  const vis = arrivalsOf(ds, ['Regional', 'Nacional', 'Internacional'])
  const intl = arrivalsOf(ds, ['Internacional'])
  const res = arrivalsOf(ds, ['Residente'])
  const raw = {
    dens: BARRIOS.map((x) => arr[x.i] / x.area),
    fri: ds.metrics.map((m) => m.friE),
    vis: BARRIOS.map((x) => (arr[x.i] ? vis[x.i] / arr[x.i] : 0)),
    tour: BARRIOS.map((x) => vis[x.i]),
    intl: BARRIOS.map((x) => (arr[x.i] ? intl[x.i] / arr[x.i] : 0)),
    magnet: ds.metrics.map((m) => m.visitorsPerRes),
    weekday: ds.metrics.map((m) => 1 - Math.abs(m.friE - 1)),
    pop: BARRIOS.map((x) => pop[x.i]),
    local: ds.metrics.map((m) => -m.tripsPerRes),
    res: BARRIOS.map((x) => (arr[x.i] ? res[x.i] / arr[x.i] : 0)),
  }
  const ranks = Object.fromEntries(b.parts.map(([k]) => [k, rank(raw[k], mask)]))
  const score = new Float32Array(N)
  for (let i = 0; i < N; i++) score[i] = mask[i] ? b.parts.reduce((a, [k, w]) => a + w * ranks[k][i], 0) : 0
  const order = [...score.keys()].filter((i) => mask[i]).sort((x, y) => score[y] - score[x])
  const why = (i) => {
    const best = [...b.parts].sort((x, y) => ranks[y[0]][i] * y[1] - ranks[x[0]][i] * x[1])
    return best.slice(0, 2).filter(([k]) => ranks[k][i] > 0.6).map(([, , txt]) => txt)
  }
  // how each indicator adds up to the final mark of a barrio (for the breakdown in the panel)
  const detail = (i) => b.parts.map(([k, w, txt]) => ({ k, w, txt, rank: ranks[k][i], pts: w * ranks[k][i] }))
  return { business: b, score, order, top: order.slice(0, 3).map((i) => ({ i, score: score[i], why: why(i) })), why, detail }
}

/* ------------------------------------------------------------------ Simulador */
export const SCENARIOS = [
  {
    key: 'evento',
    label: 'Gran evento',
    desc: 'Un partido, un concierto o una feria atrae a miles de personas a un barrio.',
    place: 'La Maternitat i Sant Ramon',
    amount: { label: 'Asistentes', min: 5000, max: 100000, step: 5000, value: 60000, fmt: (v) => `${(v / 1000).toLocaleString('es-ES')} mil` },
  },
  {
    key: 'cierre',
    label: 'Cierre por obras',
    desc: 'Un barrio queda casi cerrado: quien iba allí se reparte entre los vecinos.',
    place: 'el Barri Gòtic',
    amount: { label: 'Viajes que se desvían', min: 20, max: 100, step: 10, value: 70, fmt: (v) => `${v} %` },
  },
  {
    key: 'teletrabajo',
    label: 'Más teletrabajo',
    desc: 'Una parte de quien va a trabajar a otro barrio se queda en casa.',
    place: null,
    amount: { label: 'Viajes de trabajo que se pierden', min: 10, max: 60, step: 5, value: 30, fmt: (v) => `${v} %` },
  },
]

export const findBarrio = (name) => {
  const n = name.toLowerCase()
  const i = BARRIOS.findIndex((b) => b.name.toLowerCase() === n)
  return i >= 0 ? i : BARRIOS.findIndex((b) => b.name.toLowerCase().includes(n.replace(/^(el|la|les|els) /, '')))
}

// Returns base and simulated arrivals for the day, the change per barrio and the main affected flows.
export function simulate(ds, key, { place, amount, day }) {
  const F = ds.F[day]
  const base = new Float32Array(N)
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) base[j] += F[i * N + j]
  const sim = Float32Array.from(base)
  const flows = [] // {i, j, v}: extra (+) or removed (−) trips
  if (key === 'evento' && place >= 0) {
    // attendees come from every barrio, in proportion to how many trips it generates and how close it is
    const w = new Float64Array(N)
    let tot = 0
    for (let i = 0; i < N; i++) {
      let out = 0
      for (let j = 0; j < N; j++) out += F[i * N + j]
      w[i] = i === place ? 0 : out * Math.exp(-DM[i * N + place] / 4.5)
      tot += w[i]
    }
    for (let i = 0; i < N; i++) {
      const v = tot ? (amount * w[i]) / tot : 0
      sim[place] += v
      if (v > 0) flows.push({ i, j: place, v })
    }
  } else if (key === 'cierre' && place >= 0) {
    const k = amount / 100
    const moved = base[place] * k
    sim[place] -= moved
    // the trips go to the nearest barrios, weighted by how attractive they already are
    const near = [...Array(N).keys()].filter((j) => j !== place).sort((a, b) => DM[place * N + a] - DM[place * N + b]).slice(0, 5)
    const wt = near.map((j) => base[j] / (0.5 + DM[place * N + j]))
    const tw = wt.reduce((a, b) => a + b, 0) || 1
    near.forEach((j, q) => { const v = (moved * wt[q]) / tw; sim[j] += v; flows.push({ i: place, j, v }) })
  } else if (key === 'teletrabajo') {
    // commuting = residents going to barrios that receive many more people than live there
    const k = amount / 100
    const magnet = ds.metrics.map((m) => Math.min(1, m.visitorsPerRes / 3))
    const R = ds.segF?.Residente?.[day]
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        if (i === j) continue
        const v = (R ? R[i * N + j] : F[i * N + j] * 0.6) * k * magnet[j]
        sim[j] -= v
        if (v > 0) flows.push({ i, j, v: -v })
      }
    }
  }
  const change = Float32Array.from(sim, (v, i) => (base[i] ? v / base[i] - 1 : 0))
  const byChange = [...change.keys()].filter((i) => base[i] > 300).sort((a, b) => change[b] - change[a])
  flows.sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
  const allFlows = flows.slice()
  const totalBase = base.reduce((a, b) => a + b, 0)
  const totalSim = sim.reduce((a, b) => a + b, 0)
  return { base, sim, change, gainers: byChange.filter((i) => change[i] > 0.005).slice(0, 3), losers: byChange.filter((i) => change[i] < -0.005).slice(-3).reverse(), flows: flows.slice(0, 40), allFlows, totalDelta: totalSim - totalBase }
}

/* ------------------------------------------------------------------ Turismo */
export const VISITOR_KINDS = [
  { key: 'all', label: 'Todos los visitantes', names: ['Regional', 'Nacional', 'Internacional'] },
  { key: 'intl', label: 'Extranjero', names: ['Internacional'] },
  { key: 'nac', label: 'Resto de España', names: ['Nacional'] },
  { key: 'reg', label: 'Resto de Cataluña', names: ['Regional'] },
]

// Share of arrivals that come from the chosen kind of visitor, for one day.
export function visitorShareOf(ds, day, kind = 'all') {
  if (!ds.segArr) return null
  const names = (VISITOR_KINDS.find((k) => k.key === kind) || VISITOR_KINDS[0]).names
  const out = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    let tot = 0
    let v = 0
    for (const n of Object.keys(ds.segArr)) { const a = ds.segArr[n][day][i]; tot += a; if (names.includes(n)) v += a }
    out[i] = tot ? v / tot : 0
  }
  return out
}

// City-wide visitors per month (average weekday), from summary.json.
export function visitorSeason(summary, kind = 'all') {
  if (!summary) return null
  const names = (VISITOR_KINDS.find((k) => k.key === kind) || VISITOR_KINDS[0]).names
  const months = summary.periods.filter((p) => p.kind === 'month')
  const vals = months.map((p) => names.reduce((a, n) => a + (summary.arr[p.id]?.[n] || []).reduce((x, y) => x + y, 0), 0))
  return { months, vals }
}
