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
      transformHeader: (h) => h.replace(/^﻿/, '').trim(),
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

// Columns that hold the traveller type in the raw files (Residente, Regional, …). In the raw
// monthly files «origen» is that column; it is only used when it is not the barrio column.
const SEG_ALIASES = ['tipo viajero', 'tipo de viajero', 'segmento', 'segment', 'origen']
const MAX_SEGMENTS = 12

// date / day string → weekday, cached (the raw files repeat the same few dates thousands of times)
function dayParser(oneBased) {
  const cache = new Map()
  return (v) => {
    const k = String(v ?? '')
    let r = cache.get(k)
    if (r) return r
    const iso = /^\s*(\d{4})-(\d{2})-(\d{2})(?:$|[ T])/.exec(k)
    if (iso) {
      // plain calendar date: compute the weekday in UTC so the browser's time zone can't shift it
      const wd = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3])).getUTCDay()
      r = wd === 0 || wd === 6 ? { d: -2 } : { d: wd - 1, date: `${iso[1]}-${iso[2]}-${iso[3]}` }
    } else r = parseDay(v, oneBased)
    cache.set(k, r)
    return r
  }
}

// Streams a flows CSV (any size) and builds a «period» with the same shape as the preprocessed
// JSON files (public/data/movilidad/*.json): { id, label, n, nDays, segments, seg: {name: [5 × N*N]} }.
// Each weekday is averaged over the distinct dates it appears on, as scripts/preprocess-mobility.mjs does.
export function importFlows(file, { onProgress } = {}) {
  const report = { rows: 0, used: 0, weekend: 0, invalid: 0, unmatched: new Map(), columns: null, days: new Set(), weeksAveraged: 0, segments: [] }
  const sums = new Map() // segment → [5 × Float64Array(N*N)]
  const dates = Array.from({ length: STEPS }, () => new Set())
  const undated = new Array(STEPS).fill(false)
  const cache = new Map()
  const match = (v) => { const k = String(v ?? ''); let i = cache.get(k); if (i == null) { i = matchBarrio(v); cache.set(k, i) } return i }
  let cols = null
  let segCol = null
  let day = null
  const size = file.size || (typeof file === 'string' ? file.length : 0)

  const setup = (headers, rows) => {
    cols = detect(headers, ALIASES)
    report.columns = cols
    if (!cols.origin || !cols.dest) return false
    // traveller-type column: must not be the barrio column and must hold a handful of non-barrio labels
    const segHit = headers.find((h) => SEG_ALIASES.includes(key(h)) && h !== cols.origin && h !== cols.dest)
    if (segHit) {
      const vals = new Set(rows.slice(0, 5000).map((r) => String(r[segHit] ?? '').trim()).filter(Boolean))
      const barrioLike = [...vals].filter((v) => matchBarrio(v) >= 0).length
      if (vals.size && vals.size <= MAX_SEGMENTS && barrioLike < vals.size / 2) segCol = segHit
    }
    report.columns = { ...cols, ...(segCol ? { segment: segCol } : {}) }
    // decide whether numeric days are 0- or 1-based
    let oneBased = true
    if (cols.day) {
      const nums = rows.slice(0, 2000).map((r) => String(r[cols.day] ?? '').trim()).filter((s) => /^\d+$/.test(s)).map(Number)
      if (nums.includes(0)) oneBased = false
    }
    day = dayParser(oneBased)
    return true
  }

  const add = (r) => {
    report.rows++
    const o = match(r[cols.origin])
    const de = match(r[cols.dest])
    if (o < 0 || de < 0) {
      const bad = o < 0 ? r[cols.origin] : r[cols.dest]
      if (bad != null && String(bad).trim() !== '') report.unmatched.set(String(bad), (report.unmatched.get(String(bad)) || 0) + 1)
      else report.invalid++
      return
    }
    let d = 0
    let date = null
    if (cols.day) {
      const pd = day(r[cols.day])
      if (pd.d === -2) { report.weekend++; return }
      if (pd.d === -1) { report.invalid++; return }
      d = pd.d
      date = pd.date || null
    }
    const n = cols.count ? parseCount(r[cols.count]) : 1
    if (Number.isNaN(n)) { report.invalid++; return }
    const seg = segCol ? String(r[segCol] ?? '').trim() || 'Sin tipo' : 'Todos'
    let S = sums.get(seg)
    if (!S) {
      if (sums.size >= MAX_SEGMENTS) { report.invalid++; return }
      S = Array.from({ length: STEPS }, () => new Float64Array(N * N))
      sums.set(seg, S)
    }
    S[d][o * N + de] += n
    report.used++
    report.days.add(d)
    if (date) dates[d].add(date)
    else undated[d] = true
  }

  return new Promise((resolve, reject) => {
    let failed = false
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      chunkSize: 4 * 1024 * 1024,
      transformHeader: (h) => h.replace(/^﻿/, '').trim(),
      chunk: (res, parser) => {
        if (!cols && !setup(res.meta.fields || [], res.data)) {
          failed = true
          parser.abort()
          return
        }
        for (const r of res.data) add(r)
        if (onProgress && size) onProgress(Math.min(1, (res.meta.cursor || 0) / size))
      },
      complete: () => {
        if (failed || !cols?.origin || !cols?.dest) {
          report.error = 'No encuentro las columnas de origen y destino. Llámalas, por ejemplo, «origen» y «destino».'
          return resolve({ report })
        }
        if (!report.used) {
          report.error = 'Ninguna fila se pudo usar. Revisa que los nombres de barrio coinciden con los oficiales o usa sus códigos (1–73 u 080190101).'
          return resolve({ report })
        }
        // days per weekday to average over: distinct dates, or 1 when the file only names the weekday
        const nDays = dates.map((set, d) => set.size || (undated[d] ? 1 : 0))
        report.weeksAveraged = Math.max(0, ...dates.map((s) => s.size))
        const known = ['Residente', 'Regional', 'Nacional', 'Internacional']
        const segments = [...sums.keys()].sort((a, b) => {
          const ia = known.indexOf(a); const ib = known.indexOf(b)
          return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b)
        })
        report.segments = segCol ? segments : []
        const seg = {}
        for (const name of segments) {
          seg[name] = sums.get(name).map((A, d) => {
            const M = new Float32Array(N * N)
            const k = nDays[d] || 1
            for (let x = 0; x < M.length; x++) M[x] = A[x] / k
            return M
          })
        }
        const name = file.name || 'CSV'
        resolve({ period: { id: 'csv', label: name, n: N, nDays, segments, seg }, report })
      },
      error: (e) => reject(e),
    })
  })
}

// Reads only the header row, to tell a flows file from an attributes file before parsing it all.
export function readHeaders(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      preview: 1,
      transformHeader: (h) => h.replace(/^﻿/, '').trim(),
      complete: (res) => resolve(res.meta.fields || []),
      error: reject,
    })
  })
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
