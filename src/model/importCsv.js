// Reads a mobility CSV (and an optional attributes CSV) and turns it into the DAILY
// origin→destination cube (Monday … Friday) used by the whole app. Hours are ignored.
// It also understands the raw monthly files (movilidad_barrios_YYYY-MM_origen.csv).
import Papa from 'papaparse'
import { N, BARRIOS, matchBarrio, normalizeName } from './geo.js'
import { STEPS } from './simulate.js'

const ALIASES = {
  // order matters: in the raw files «origen» is the traveller type and the barrio is «barrio_origen»
  origin: ['barrio origen', 'barrio_origen', 'barri origen', 'origen', 'origin', 'from', 'salida', 'o'],
  dest: ['barrio destino', 'barrio_destino', 'barri desti', 'destino', 'destination', 'to', 'llegada', 'd'],
  day: ['day', 'dia', 'fecha', 'date', 'data', 'weekday', 'dia semana', 'dia_semana'],
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
    let hit = null
    for (const a of list) { hit = norm.find((h) => h.n === key(a)); if (hit) break }
    if (!hit) for (const a of list) { if (key(a).length > 2) hit = norm.find((h) => h.n.includes(key(a)) && !h.n.endsWith('name')); if (hit) break }
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
function parseCount(v) {
  if (v == null || v === '') return 1
  const s = String(v).trim()
  // «1.234» (thousands) vs «12.5» (decimal): only strip dots that group thousands
  const n = Number(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(',', '.'))
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
  const report = { rows: rows.length, used: 0, weekend: 0, invalid: 0, unmatched: new Map(), columns: cols, days: new Set(), dates: new Map() }
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
  const F = Array.from({ length: STEPS }, () => new Float32Array(N * N))
  const cache = new Map()
  const match = (v) => { const k = String(v ?? ''); let i = cache.get(k); if (i == null) { i = matchBarrio(v); cache.set(k, i) } return i }
  for (const r of rows) {
    const o = match(r[cols.origin])
    const de = match(r[cols.dest])
    if (o < 0 || de < 0) {
      const bad = o < 0 ? r[cols.origin] : r[cols.dest]
      if (bad != null && String(bad).trim() !== '') report.unmatched.set(String(bad), (report.unmatched.get(String(bad)) || 0) + 1)
      else report.invalid++
      continue
    }
    let d = 0
    let date = null
    if (cols.day) {
      const pd = parseDay(r[cols.day], oneBased)
      if (pd.d === -2) { report.weekend++; continue }
      if (pd.d === -1) { report.invalid++; continue }
      d = pd.d
      date = pd.date || null
    }
    const n = cols.count ? parseCount(r[cols.count]) : 1
    if (Number.isNaN(n)) { report.invalid++; continue }
    F[d][o * N + de] += n
    report.used++
    report.days.add(d)
    if (date) {
      if (!report.dates.has(d)) report.dates.set(d, new Set())
      report.dates.get(d).add(date)
    }
  }
  // several weeks in the file → average per weekday
  for (const [d, set] of report.dates) {
    const k = set.size
    if (k > 1) { const A = F[d]; for (let x = 0; x < A.length; x++) A[x] /= k }
  }
  report.weeksAveraged = Math.max(0, ...[...report.dates.values()].map((s) => s.size))
  if (!report.used) report.error = 'Ninguna fila se pudo usar. Revisa que los nombres de barrio coinciden con los oficiales o usa sus códigos (1–73 u 080190101).'
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
  const lines = ['origen,destino,dia,viajes']
  for (let t = 0; t < STEPS; t++) {
    const Ft = ds.F[t]
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const v = Ft[i * N + j]
      if (v >= minValue) lines.push(`"${BARRIOS[i].name}","${BARRIOS[j].name}",${DAY[t]},${Math.round(v)}`)
    }
  }
  return lines.join('\n')
}

export const TEMPLATE_CSV = [
  'origen,destino,dia,viajes',
  'Sants,la Vila de Gràcia,Lunes,4120',
  'el Raval,el Barri Gòtic,Lunes,1980',
  '31,7,Martes,3500',
  'el Poblenou,Diagonal Mar i el Front Marítim del Poblenou,Viernes,1200',
  '"Sant Gervasi - Galvany","la Dreta de l\'Eixample",2025-03-12,2330',
].join('\n')

export const ATTR_TEMPLATE_CSV = ['barrio,poblacion,restaurantes', 'el Raval,47986,612', 'la Vila de Gràcia,51364,598', 'Sants,41723,301'].join('\n')
