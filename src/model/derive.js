// Turns a raw DAILY origin→destination cube (5 weekdays × N × N trips) into everything the UI needs.
// Index 0 = Monday … 4 = Friday. The data has no hours, so every metric is per day.
import { BARRIOS, N } from './geo.js'
import { STEPS } from './simulate.js'
import { DAYS } from '../lib/colors.js'

const quantile = (arr, q) => {
  const s = Float64Array.from(arr).sort()
  return s[Math.floor(q * (s.length - 1))] || 0
}
const WEEK = [0, 1, 2, 3, 4]

export function deriveDataset(F, attrs, source = { kind: 'simulado', label: 'Datos simulados' }) {
  const pop = attrs.pop
  const rest = attrs.rest
  const area = BARRIOS.map((b) => b.area)
  const ARR = [] // trips arriving at each barrio (including the ones that stay inside)
  const DEP = [] // trips starting in each barrio
  const STAY = [] // trips that start and end in the same barrio
  const MOV = new Float32Array(STEPS) // trips between different barrios, whole city
  const DENS = [] // arrivals per km²
  for (let t = 0; t < STEPS; t++) {
    const a = new Float32Array(N)
    const d = new Float32Array(N)
    const s = new Float32Array(N)
    let mv = 0
    const Ft = F[t]
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const v = Ft[i * N + j]
        if (!v) continue
        a[j] += v
        d[i] += v
        if (i === j) s[i] += v
        else mv += v
      }
    }
    ARR.push(a)
    DEP.push(d)
    STAY.push(s)
    MOV[t] = mv
    DENS.push(a.map((v, j) => v / area[j]))
  }
  const allDens = []
  DENS.forEach((d) => d.forEach((v) => allDens.push(v)))
  const densRef = quantile(allDens, 0.97) || 1
  const maxMov = Math.max(...MOV) || 1
  const DAYTOT = Array.from(MOV)
  const maxArr = Math.max(...ARR.map((a) => Math.max(...a))) || 1

  const metrics = BARRIOS.map((b) => {
    const i = b.i
    // bubble index: of all trips that START in the barrio that day, the share that also END there
    const bub = WEEK.map((d) => (DEP[d][i] ? STAY[d][i] / DEP[d][i] : 0))
    let max = 0
    let peak = 0
    let weekArr = 0
    let weekDep = 0
    let visitors = 0
    for (let d = 0; d < STEPS; d++) {
      const v = ARR[d][i]
      weekArr += v
      weekDep += DEP[d][i]
      visitors += v - STAY[d][i]
      if (v > max) { max = v; peak = d }
    }
    const avgArr = weekArr / STEPS
    return {
      i,
      bub,
      bubAvg: bub.reduce((a, c) => a + c, 0) / STEPS,
      arr: WEEK.map((d) => ARR[d][i]),
      friE: ARR[0][i] ? ARR[4][i] / ARR[0][i] : 1, // Friday vs Monday arrivals
      peakE: avgArr ? max / avgArr : 1, // how much the busiest day stands out
      max, peak, weekArr, weekDep,
      visitorShare: weekArr ? visitors / weekArr : 0, // arrivals that come from another barrio
      visitorsPerRes: pop[i] ? visitors / STEPS / (pop[i] * 1000) : 0,
      tripsPerRes: pop[i] ? weekDep / STEPS / (pop[i] * 1000) : 0,
    }
  })

  // city-wide bubble per day
  const cityBub = WEEK.map((d) => {
    let s = 0
    let tot = 0
    for (let i = 0; i < N; i++) { s += STAY[d][i]; tot += DEP[d][i] }
    return tot ? s / tot : 0
  })

  // The real data only records trips BETWEEN different barrios (no origin = destination rows),
  // so the bubble index is 0 everywhere. hasStays = false makes the UI skip bubble-based text.
  const hasStays = cityBub.some((v) => v > 0)

  // personality tags (data-driven, so they work for any period / traveller type)
  const eligible = metrics.filter((m) => pop[m.i] >= 5 && m.weekArr > 0)
  const rankDesc = (key) => [...eligible].sort((a, b) => b[key] - a[key]).map((m) => m.i)
  const friTop = new Set(rankDesc('friE').slice(0, 6))
  const bubHi = quantile(metrics.map((m) => m.bubAvg), 0.85)
  const bubLo = quantile(metrics.map((m) => m.bubAvg), 0.15)
  const visHi = quantile(metrics.map((m) => m.visitorsPerRes), 0.85)
  const visLo = quantile(metrics.map((m) => m.visitorsPerRes), 0.15)
  metrics.forEach((m) => {
    if (m.peakE > 1.3) m.tag = { label: `Día fuerte: ${DAYS[m.peak].name.toLowerCase()}`, text: `El ${DAYS[m.peak].name.toLowerCase()} recibe un ${Math.round((m.peakE - 1) * 100)} % más de llegadas que su media de lunes a viernes.` }
    else if (friTop.has(m.i) && m.friE > 1.08) m.tag = { label: 'Rey del viernes', text: `El viernes recibe un ${Math.round((m.friE - 1) * 100)} % más de llegadas que el lunes.` }
    else if (m.visitorsPerRes >= visHi) m.tag = { label: 'Imán de visitantes', text: 'Recibe mucha gente de otros barrios en relación con los vecinos que tiene.' }
    else if (hasStays && m.bubAvg >= bubHi) m.tag = { label: 'Burbuja cerrada', text: 'Una gran parte de los viajes que empiezan aquí no salen del barrio.' }
    else if (hasStays && m.bubAvg <= bubLo) m.tag = { label: 'Barrio viajero', text: 'Sus vecinos se van a otros barrios para casi todo.' }
    else if (m.visitorsPerRes <= visLo) m.tag = { label: 'Barrio residencial', text: 'Llega poca gente de fuera en relación con los vecinos que tiene.' }
    else m.tag = { label: 'Barrio equilibrado', text: 'Combina vida de barrio con salidas al resto de la ciudad.' }
  })

  // regression: restaurants vs bubble (per day and whole week)
  const regression = WEEK.map((d) => linreg(metrics.map((m) => rest[m.i]), metrics.map((m) => m.bub[d])))
  const regressionWeek = linreg(metrics.map((m) => rest[m.i]), metrics.map((m) => m.bubAvg))

  const ds = {
    F, ARR, DEP, STAY, MOV, DENS, densRef, maxMov, maxArr, DAYTOT, metrics, cityBub, hasStays,
    regression, regressionWeek, pop, rest, source,
    version: Date.now(),
  }
  ds.insights = buildInsights(ds)
  return ds
}

export function linreg(xs, ys) {
  const n = xs.length
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let sxy = 0, sxx = 0, syy = 0
  for (let k = 0; k < n; k++) { sxy += (xs[k] - mx) * (ys[k] - my); sxx += (xs[k] - mx) ** 2; syy += (ys[k] - my) ** 2 }
  const slope = sxx ? sxy / sxx : 0
  return { slope, intercept: my - slope * mx, r: sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0 }
}

const pct = (v) => `${Math.round(v * 100)} %`
const fmt = (n) => Math.round(n).toLocaleString('es-ES')

function buildInsights(ds) {
  const { metrics, DAYTOT, cityBub, pop, hasStays } = ds
  const out = []
  const elig = metrics.filter((m) => pop[m.i] >= 5 && m.weekArr > 0)
  const fr = [...elig].sort((a, b) => b.friE - a.friE)[0]
  if (fr && fr.friE > 1.03) out.push({ day: 4, t: 4, sel: fr.i, title: 'Efecto viernes', text: `${BARRIOS[fr.i].name} recibe un ${Math.round((fr.friE - 1) * 100)} % más de llegadas el viernes que el lunes.` })
  const pk = [...elig].sort((a, b) => b.peakE - a.peakE)[0]
  if (pk && pk.peakE > 1.1) out.push({ day: pk.peak, t: pk.peak, sel: pk.i, title: 'El día más distinto', text: `El ${DAYS[pk.peak].name.toLowerCase()}, ${BARRIOS[pk.i].name} recibe un ${Math.round((pk.peakE - 1) * 100)} % más de gente que su media semanal.` })
  const hi = cityBub.indexOf(Math.max(...cityBub))
  const lo = cityBub.indexOf(Math.min(...cityBub))
  if (hasStays) out.push({ day: lo, t: lo, title: 'Cuándo se abre la burbuja', text: `El ${DAYS[hi].name.toLowerCase()} se queda en su barrio el ${pct(cityBub[hi])} de los viajes; el ${DAYS[lo].name.toLowerCase()}, el ${pct(cityBub[lo])}.` })
  const bd = DAYTOT.indexOf(Math.max(...DAYTOT))
  const ld = DAYTOT.indexOf(Math.min(...DAYTOT))
  out.push({ day: bd, t: bd, title: 'El día con más vida', text: `El ${DAYS[bd].name.toLowerCase()} suma ${fmt(DAYTOT[bd])} viajes entre barrios, un ${Math.round((DAYTOT[bd] / (DAYTOT[ld] || 1) - 1) * 100)} % más que el ${DAYS[ld].name.toLowerCase()}.` })
  const closed = [...elig].sort((a, b) => b.bubAvg - a.bubAvg)[0]
  if (hasStays && closed) out.push({ day: 2, t: 2, sel: closed.i, title: 'La burbuja más cerrada', text: `En ${BARRIOS[closed.i].name}, el ${pct(closed.bubAvg)} de los viajes que empiezan en el barrio también acaban en él.` })
  const open = [...elig].sort((a, b) => a.bubAvg - b.bubAvg)[0]
  if (hasStays && open) out.push({ day: 2, t: 2, sel: open.i, title: 'La burbuja más abierta', text: `En ${BARRIOS[open.i].name} solo el ${pct(open.bubAvg)} de los viajes se queda dentro del barrio.` })
  const vis = [...elig].sort((a, b) => b.visitorsPerRes - a.visitorsPerRes)[0]
  if (vis) out.push({ day: 2, t: 2, sel: vis.i, title: 'El gran imán', text: `${BARRIOS[vis.i].name} recibe cada día ${vis.visitorsPerRes.toLocaleString('es-ES', { maximumFractionDigits: 1 })} visitantes de otros barrios por cada vecino.` })
  return out
}

// ---- helpers used across the UI (t is a day position: 0 = Monday … 4 = Friday, fractional while animating)
export const stepOf = (t) => ((Math.round(t) % STEPS) + STEPS) % STEPS
export const lerpArr = (A, t) => {
  const t0 = ((Math.floor(t) % STEPS) + STEPS) % STEPS
  const t1 = (t0 + 1) % STEPS
  const f = t - Math.floor(t)
  const o = new Float32Array(A[0].length)
  for (let k = 0; k < o.length; k++) o[k] = A[t0][k] * (1 - f) + A[t1][k] * f
  return o
}
export const valueAt = (series, t) => {
  const t0 = ((Math.floor(t) % STEPS) + STEPS) % STEPS
  const t1 = (t0 + 1) % STEPS
  const f = t - Math.floor(t)
  return series[t0] * (1 - f) + series[t1] * f
}
export function topFrom(ds, i, t, k = 5) {
  const Ft = ds.F[stepOf(t)]
  const out = []
  for (let j = 0; j < N; j++) if (j !== i) out.push({ j, v: Ft[i * N + j] })
  return out.sort((a, b) => b.v - a.v).slice(0, k)
}
export function topTo(ds, i, t, k = 5) {
  const Ft = ds.F[stepOf(t)]
  const out = []
  for (let j = 0; j < N; j++) if (j !== i) out.push({ j, v: Ft[j * N + i] })
  return out.sort((a, b) => b.v - a.v).slice(0, k)
}
export function districtMatrix(ds, t) {
  const Ft = ds.F[stepOf(t)]
  const M = Array.from({ length: 10 }, () => new Array(10).fill(0))
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) M[BARRIOS[i].dist - 1][BARRIOS[j].dist - 1] += Ft[i * N + j]
  return M
}
