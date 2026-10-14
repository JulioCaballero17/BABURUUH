// Reads the real mobility CSV (and an optional attributes CSV) and turns it into the
// 120-hour origin→destination cube used by the whole app.
import Papa from 'papaparse'
import { N, BARRIOS, matchBarrio, normalizeName } from './geo.js'
import { HOURS } from './simulate.js'

const ALIASES = {
  origin: ['origen', 'origin', 'barrio origen', 'barrio_origen', 'barri origen', 'from', 'salida', 'o'],
  dest: ['destino', 'destination', 'barrio destino', 'barrio_destino', 'barri desti', 'to', 'llegada', 'd'],
  day: ['dia', 'day', 'weekday', 'dia semana', 'dia_semana', 'fecha', 'date', 'data'],
  hour: ['hora', 'hour', 'h', 'franja', 'franja horaria', 'hora inicio', 'time'],
  count: ['personas', 'viajes', 'trips', 'count', 'n', 'total', 'volumen', 'flujo', 'valor', 'value', 'persones', 'desplazamientos'],
}
const ATTR_ALIASES = {
  barrio: ['barrio', 'barri', 'nombre', 'nom', 'name', 'codigo', 'codi', 'code'],
  pop: ['poblacion', 'habitantes', 'poblacio', 'population', 'residentes', 'pop'],
  rest: ['restaurantes', 'restaurants', 'restauracion', 'bares', 'locales'],
}
const key = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim()

function detect(headers, aliases) {
  const map = {}
  const norm = headers.map((h) => ({ raw: h, n: key(h) }))
  for (const [field, list] of Object.entries(aliases)) {
    const hit = norm.find((h) => list.some((a) => h.n === key(a))) || norm.find((h) => list.some((a) => key(a).length > 2 && h.n.includes(key(a))))
    if (hit) map[field] = hit.raw
  }
  return map
}

const DAY_WORDS = [
  ['lunes', 'lun', 'l', 'monday', 'mon', 'dilluns', 'dl'],
  ['martes', 'mar', 'm', 'tuesday', 'tue', 'dimarts', 'dt'],
  ['miercoles', 'mie', 'x', 'wednesday', 'wed', 'dimecres', 'dc'],
  ['jueves', 'jue', 'j', 'thursday', 'thu', 'dijous', 'dj'],
  ['viernes', 'vie', 'v', 'friday', 'fri', 'divendres', 'dv'],
]
const WEEKEND = ['sabado', 'sab', 's', 'saturday', 'sat', 'dissabte', 'domingo', 'dom', 'sunday', 'sun', 'diumenge']

function parseDay(v, oneBased) {
  if (v == null || v === '') return { d: -1 }
  const s = String(v).trim()
  const n = Number(s)
  if (s !== '' && !Number.isNaN(n) && /^\d+$/.test(s)) {
    const d = oneBased ? n - 1 : n
    return { d: d >= 0 && d <= 4 ? d : -2 }
  }
  const w = key(s)
  for (let d = 0; d < 5; d++) if (DAY_WORDS[d].includes(w)) return { d }
  if (WEEKEND.includes(w)) return { d: -2 }
  const dt = new Date(s.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'))
  if (!Number.isNaN(dt.getTime())) {
    const wd = dt.getDay()
    if (wd === 0 || wd === 6) return { d: -2, date: dt.toISOString().slice(0, 10) }
    return { d: wd - 1, date: dt.toISOString().slice(0, 10), hour: dt.getHours(), hasTime: /\d{1,2}:\d{2}/.test(s) }
  }
  return { d: -1 }
}
function parseHour(v) {
  if (v == null || v === '') return -1
  const s = String(v).trim()
  const m = s.match(/^(\d{1,2})(?:[:h.](\d{2}))?/)
  if (!m) return -1
  const h = Number(m[1])
  return h >= 0 && h <= 24 ? h % 24 : -1
}
function parseCount(v) {
  if (v == null || v === '') return 1
  const n = Number(String(v).replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : NaN
}

export function readFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      complete: (res) => resolve(res),
      error: reject,
    })
  })
}

export function detectKind(headers) {
  const flows = detect(headers, ALIASES)
  if (flows.origin && flows.dest) return 'flows'
  const at = detect(headers, ATTR_ALIASES)
  if (at.barrio && (at.pop || at.rest)) return 'attributes'
  return 'unknown'
}

export function buildFlows(rows, headers) {
  const cols = detect(headers, ALIASES)
  const report = { rows: rows.length, used: 0, weekend: 0, invalid: 0, unmatched: new Map(), columns: cols, days: new Set(), hours: new Set(), dates: new Map() }
  if (!cols.origin || !cols.dest) {
    report.error = 'No encuentro las columnas de origen y destino. Llámalas, por ejemplo, «origen» y «destino».'
    return { report }
  }
  // decide whether numeric days are 0- or 1-based
  let oneBased = true
  if (cols.day) {
    const nums = rows.slice(0, 2000).map((r) => Number(r[cols.day])).filter((n) => Number.isInteger(n))
    if (nums.includes(0)) oneBased = false
  }
  const F = Array.from({ length: HOURS }, () => new Float32Array(N * N))
  for (const r of rows) {
    const o = matchBarrio(r[cols.origin])
    const de = matchBarrio(r[cols.dest])
    if (o < 0 || de < 0) {
      const bad = o < 0 ? r[cols.origin] : r[cols.dest]
      if (bad != null && String(bad).trim() !== '') report.unmatched.set(String(bad), (report.unmatched.get(String(bad)) || 0) + 1)
      else report.invalid++
      continue
    }
    let d = 0
    let date = null
    let hourFromDate = -1
    if (cols.day) {
      const pd = parseDay(r[cols.day], oneBased)
      if (pd.d === -2) { report.weekend++; continue }
      if (pd.d === -1) { report.invalid++; continue }
      d = pd.d
      date = pd.date || null
      if (pd.hasTime) hourFromDate = pd.hour
    }
    let h = cols.hour ? parseHour(r[cols.hour]) : hourFromDate
    if (h < 0) h = hourFromDate >= 0 ? hourFromDate : 12
    const n = cols.count ? parseCount(r[cols.count]) : 1
    if (Number.isNaN(n)) { report.invalid++; continue }
    F[d * 24 + h][o * N + de] += n
    report.used++
    report.days.add(d)
    report.hours.add(h)
    if (date) {
      if (!report.dates.has(d)) report.dates.set(d, new Set())
      report.dates.get(d).add(date)
    }
  }
  // several weeks in the file → average per weekday
  for (const [d, set] of report.dates) {
    const k = set.size
    if (k > 1) for (let h = 0; h < 24; h++) { const A = F[d * 24 + h]; for (let x = 0; x < A.length; x++) A[x] /= k }
  }
  report.weeksAveraged = Math.max(0, ...[...report.dates.values()].map((s) => s.size))
  if (!report.used) report.error = 'Ninguna fila se pudo usar. Revisa que los nombres de barrio coinciden con los oficiales o usa sus códigos (1–73).'
  return { F, report }
}

export function buildAttributes(rows, headers, base) {
  const cols = detect(headers, ATTR_ALIASES)
  const pop = [...base.pop]
  const rest = [...base.rest]
  let used = 0
  const unmatched = new Map()
  const restRaw = new Array(N).fill(null)
  for (const r of rows) {
    const i = matchBarrio(r[cols.barrio])
    if (i < 0) { unmatched.set(String(r[cols.barrio]), 1); continue }
    if (cols.pop) { const p = parseCount(r[cols.pop]); if (Number.isFinite(p) && p > 0) pop[i] = p > 1000 ? p / 1000 : p }
    if (cols.rest) { const v = parseCount(r[cols.rest]); if (Number.isFinite(v)) restRaw[i] = v }
    used++
  }
  // restaurants: if the file gives absolute counts, convert to per 1,000 residents
  restRaw.forEach((v, i) => {
    if (v == null) return
    rest[i] = v > 60 ? +((v / (pop[i] * 1000)) * 1000).toFixed(1) : v
  })
  return { attrs: { pop, rest }, report: { rows: rows.length, used, unmatched, columns: cols } }
}

export function flowsToCsv(ds, minValue = 1) {
  const DAY = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
  const lines = ['origen,destino,dia,hora,personas']
  for (let t = 0; t < HOURS; t++) {
    const Ft = ds.F[t]
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const v = Ft[i * N + j]
      if (v >= minValue) lines.push(`"${BARRIOS[i].name}","${BARRIOS[j].name}",${DAY[Math.floor(t / 24)]},${t % 24},${Math.round(v)}`)
    }
  }
  return lines.join('\n')
}

export const TEMPLATE_CSV = [
  'origen,destino,dia,hora,personas',
  'Sants,la Vila de Gràcia,Lunes,8,412',
  'el Raval,el Barri Gòtic,Lunes,21,198',
  '31,7,Martes,9,350',
  'el Poblenou,Diagonal Mar i el Front Marítim del Poblenou,Viernes,23,120',
  '"Sant Gervasi - Galvany","la Dreta de l\'Eixample",2026-10-15,18,233',
].join('\n')

export const ATTR_TEMPLATE_CSV = ['barrio,poblacion,restaurantes', 'el Raval,47986,612', 'la Vila de Gràcia,51364,598', 'Sants,41723,301'].join('\n')
