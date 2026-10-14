// Turns a raw origin→destination cube (120 hours × N × N) into everything the UI needs.
import { BARRIOS, N } from './geo.js'
import { HOURS } from './simulate.js'
import { DAYS } from '../lib/colors.js'

export const EVENING = [20, 21, 22, 23]
const DAYTIME = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
const NIGHT = [0, 1, 2, 22, 23]

const quantile = (arr, q) => {
  const s = Float64Array.from(arr).sort()
  return s[Math.floor(q * (s.length - 1))] || 0
}

export function deriveDataset(F, attrs, source = { kind: 'simulado', label: 'Datos simulados' }) {
  const pop = attrs.pop
  const rest = attrs.rest
  const area = BARRIOS.map((b) => b.area)
  const ARR = []
  const DEP = []
  const STAY = []
  const MOV = new Float32Array(HOURS)
  const DENS = []
  for (let t = 0; t < HOURS; t++) {
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
  const densRef = quantile(allDens, 0.995) || 1
  const maxMov = Math.max(...MOV) || 1
  const DAYTOT = [0, 1, 2, 3, 4].map((d) => { let s = 0; for (let h = 0; h < 24; h++) s += MOV[d * 24 + h]; return s })
  const maxArr = Math.max(...ARR.map((a) => Math.max(...a))) || 1

  const bubbleOf = (i, d, hours) => {
    let s = 0
    let tot = 0
    for (const h of hours) { const t = d * 24 + h; s += STAY[t][i]; tot += DEP[t][i] }
    return tot ? s / tot : 0
  }
  const avgOver = (A, i, d, hours) => hours.reduce((s, h) => s + A[d * 24 + h][i], 0) / hours.length
  const ALL24 = Array.from({ length: 24 }, (_, h) => h)

  const metrics = BARRIOS.map((b) => {
    const i = b.i
    const bub = [0, 1, 2, 3, 4].map((d) => bubbleOf(i, d, EVENING))
    const bubDay = [0, 1, 2, 3, 4].map((d) => bubbleOf(i, d, ALL24))
    const eve = [0, 1, 2, 3, 4].map((d) => avgOver(ARR, i, d, EVENING))
    let max = 0
    let peak = 0
    let weekArr = 0
    for (let t = 0; t < HOURS; t++) { const v = ARR[t][i]; weekArr += v; if (v > max) { max = v; peak = t } }
    const night = [0, 1, 2, 3, 4].reduce((s, d) => s + avgOver(ARR, i, d, NIGHT), 0) / 5
    const dayA = [0, 1, 2, 3, 4].reduce((s, d) => s + avgOver(ARR, i, d, DAYTIME), 0) / 5
    let mornOut = 0
    let mornIn = 0
    for (let d = 0; d < 5; d++) for (const h of [7, 8, 9]) { const t = d * 24 + h; mornOut += DEP[t][i] - STAY[t][i]; mornIn += ARR[t][i] - STAY[t][i] }
    return {
      i, bub, bubDay,
      bubAvg: bub.reduce((a, c) => a + c, 0) / 5,
      eve,
      friE: eve[0] ? eve[4] / eve[0] : 1,
      thuE: eve[2] ? eve[3] / eve[2] : 1,
      max, peak, weekArr, night, dayA,
      nightRatio: dayA ? night / dayA : 0,
      mornOut, mornIn,
      perCapita: pop[i] ? weekArr / (pop[i] * 1000) : 0,
    }
  })

  const cityBub = [0, 1, 2, 3, 4].map((d) => {
    let s = 0
    let tot = 0
    for (const h of EVENING) { const t = d * 24 + h; for (let i = 0; i < N; i++) { s += STAY[t][i]; tot += DEP[t][i] } }
    return tot ? s / tot : 0
  })

  // personality tags (data-driven, so they also work for imported data)
  const eligible = metrics.filter((m) => pop[m.i] >= 5)
  const rankDesc = (key) => [...eligible].sort((a, b) => b[key] - a[key]).map((m) => m.i)
  const friTop = new Set(rankDesc('friE').slice(0, 8))
  const thuTop = new Set(rankDesc('thuE').slice(0, 5))
  const medNR = quantile(metrics.map((m) => m.nightRatio), 0.5) || 1
  const bubHi = quantile(metrics.map((m) => m.bubAvg), 0.85)
  const bubLo = quantile(metrics.map((m) => m.bubAvg), 0.15)
  metrics.forEach((m) => {
    const nr = m.nightRatio / medNR
    const w = BARRIOS[m.i].wrk
    const wedPeak = DAYS[Math.floor(m.peak / 24)].key === 'X' && m.peak % 24 >= 18
    if (wedPeak && m.max > 3 * m.dayA) m.tag = { label: 'Noche de evento', text: 'Su pico de la semana llega un miércoles por la tarde-noche: un evento multiplica sus llegadas.' }
    else if (friTop.has(m.i) && m.friE > 1.25) m.tag = { label: 'Rey del viernes', text: `El viernes por la noche recibe un ${Math.round((m.friE - 1) * 100)} % más de gente que el lunes.` }
    else if (thuTop.has(m.i) && m.thuE > 1.15) m.tag = { label: 'Jueves universitario', text: `El jueves por la noche crece un ${Math.round((m.thuE - 1) * 100)} % respecto al miércoles.` }
    else if (w >= 0.7 && nr < 0.85) m.tag = { label: 'Imán de oficinas', text: 'Se llena en horario laboral y se apaga al acabar la jornada.' }
    else if (m.bubAvg >= bubHi) m.tag = { label: 'Burbuja cerrada', text: 'De 20 a 24 h, gran parte de sus vecinos no sale del barrio.' }
    else if (m.mornOut > m.mornIn * 1.9) m.tag = { label: 'Barrio dormitorio', text: 'Por la mañana sale bastante más gente de la que llega.' }
    else if (m.bubAvg <= bubLo) m.tag = { label: 'Barrio viajero', text: 'Sus vecinos se van a otros barrios para casi todo.' }
    else m.tag = { label: 'Barrio equilibrado', text: 'Combina vida de barrio con salidas al resto de la ciudad.' }
  })

  // regression: restaurants vs bubble (per day)
  const regression = [0, 1, 2, 3, 4].map((d) => linreg(metrics.map((m) => rest[m.i]), metrics.map((m) => m.bub[d])))
  const regressionWeek = linreg(metrics.map((m) => rest[m.i]), metrics.map((m) => m.bubAvg))

  const ds = {
    F, ARR, DEP, STAY, MOV, DENS, densRef, maxMov, maxArr, DAYTOT, metrics, cityBub,
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
const hh = (h) => `${String(h).padStart(2, '0')}:00`

function buildInsights(ds) {
  const { metrics, MOV, DAYTOT, cityBub, ARR, pop } = ds
  const out = []
  const elig = metrics.filter((m) => pop[m.i] >= 5)
  const fr = [...elig].sort((a, b) => b.friE - a.friE)[0]
  if (fr && fr.friE > 1.05) out.push({ day: 4, t: 4 * 24 + 22, sel: fr.i, title: 'Efecto viernes', text: `${BARRIOS[fr.i].name} recibe un ${Math.round((fr.friE - 1) * 100)} % más de gente el viernes por la noche que el lunes.` })
  const th = [...elig].sort((a, b) => b.thuE - a.thuE)[0]
  if (th && th.thuE > 1.05) out.push({ day: 3, t: 3 * 24 + 23, sel: th.i, title: 'Jueves universitario', text: `El jueves por la noche, ${BARRIOS[th.i].name} crece un ${Math.round((th.thuE - 1) * 100)} % respecto al miércoles.` })
  const ev = metrics.find((m) => m.tag.label === 'Noche de evento')
  if (ev) {
    const t = ev.peak
    const others = [0, 1, 3].map((d) => ARR[d * 24 + (t % 24)][ev.i])
    const ratio = ARR[t][ev.i] / (others.reduce((a, b) => a + b, 0) / others.length || 1)
    out.push({ day: Math.floor(t / 24), t, sel: ev.i, title: 'Noche de evento', text: `${DAYS[Math.floor(t / 24)].name} a las ${hh(t % 24)}: las llegadas a ${BARRIOS[ev.i].name} se multiplican por ${ratio.toLocaleString('es-ES', { maximumFractionDigits: 1 })}.` })
  }
  const dir = cityBub[4] - cityBub[0]
  out.push({ day: 4, t: 4 * 24 + 22, title: dir < 0 ? 'La burbuja se abre' : 'La burbuja se cierra', text: `De 20 a 24 h, el lunes se queda en su barrio el ${pct(cityBub[0])} de los viajes; el viernes, el ${pct(cityBub[4])}.` })
  let pk = 0
  for (let t = 1; t < MOV.length; t++) if (MOV[t] > MOV[pk]) pk = t
  out.push({ day: Math.floor(pk / 24), t: pk, title: 'Hora punta de la semana', text: `${DAYS[Math.floor(pk / 24)].name} a las ${hh(pk % 24)}: ${fmt(MOV[pk])} personas cambian de barrio en una hora.` })
  const bd = DAYTOT.indexOf(Math.max(...DAYTOT))
  const ld = DAYTOT.indexOf(Math.min(...DAYTOT))
  out.push({ day: bd, t: bd * 24 + 13, title: 'El día con más vida', text: `${DAYS[bd].name} suma ${fmt(DAYTOT[bd])} desplazamientos entre barrios, un ${Math.round((DAYTOT[bd] / DAYTOT[ld] - 1) * 100)} % más que el ${DAYS[ld].name.toLowerCase()}.` })
  const closed = [...elig].sort((a, b) => b.bubAvg - a.bubAvg)[0]
  if (closed) out.push({ day: 2, t: 2 * 24 + 21, sel: closed.i, title: 'La burbuja más cerrada', text: `En ${BARRIOS[closed.i].name}, el ${pct(closed.bubAvg)} de los viajes de 20 a 24 h empiezan y acaban dentro del barrio.` })
  return out
}

// helpers used across the UI
export const lerpArr = (A, t) => {
  const t0 = Math.floor(t) % HOURS
  const t1 = (t0 + 1) % HOURS
  const f = t - Math.floor(t)
  const o = new Float32Array(A[0].length)
  for (let k = 0; k < o.length; k++) o[k] = A[t0][k] * (1 - f) + A[t1][k] * f
  return o
}
export const valueAt = (series, t) => {
  const t0 = Math.floor(t) % HOURS
  const t1 = (t0 + 1) % HOURS
  const f = t - Math.floor(t)
  return series[t0] * (1 - f) + series[t1] * f
}
export function topFrom(ds, i, t, k = 5) {
  const Ft = ds.F[Math.floor(t) % HOURS]
  const out = []
  for (let j = 0; j < N; j++) if (j !== i) out.push({ j, v: Ft[i * N + j] })
  return out.sort((a, b) => b.v - a.v).slice(0, k)
}
export function topTo(ds, i, t, k = 5) {
  const Ft = ds.F[Math.floor(t) % HOURS]
  const out = []
  for (let j = 0; j < N; j++) if (j !== i) out.push({ j, v: Ft[j * N + i] })
  return out.sort((a, b) => b.v - a.v).slice(0, k)
}
export function districtMatrix(ds, t) {
  const Ft = ds.F[Math.floor(t) % HOURS]
  const M = Array.from({ length: 10 }, () => new Array(10).fill(0))
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) M[BARRIOS[i].dist - 1][BARRIOS[j].dist - 1] += Ft[i * N + j]
  return M
}
