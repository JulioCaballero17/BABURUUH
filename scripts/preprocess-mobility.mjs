// Turns the raw monthly mobility CSVs (movilidad_barrios_YYYY-MM_origen.csv, one row per
// day × traveller type × origin barrio × destination barrio) into small JSON files the app
// can load: for each period, the AVERAGE Monday…Friday origin→destination matrix (73 × 73),
// split by traveller type (Residente, Regional, Nacional, Internacional).
//
// Usage:
//   node scripts/preprocess-mobility.mjs <raw-folder> [out-folder]
//   node scripts/preprocess-mobility.mjs ../output_limite_legal
//
// Periods written: every month (2023-01 …), every year (2023, …) and "all".
// Weekends are ignored; each weekday is averaged over the dates it appears in the period.
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RAW = process.argv[2]
const OUT = process.argv[3] || path.join(__dirname, '..', 'public', 'data', 'movilidad')
if (!RAW) {
  console.error('Uso: node scripts/preprocess-mobility.mjs <carpeta-datos-crudos> [carpeta-salida]')
  process.exit(1)
}

const N = 73
const SEGMENTS = ['Residente', 'Regional', 'Nacional', 'Internacional']
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// ---- barrio code (080190101) → app index (0–72), checked against the app's own barrio names
const BARRIS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'barris.json'), 'utf8'))
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const byDistrict = new Map()
BARRIS.forEach((b, i) => { if (!byDistrict.has(b.d)) byDistrict.set(b.d, []); byDistrict.get(b.d).push(i) })
const codeCache = new Map()
const nameWarnings = new Set()
function barrioIndex(code, name) {
  if (codeCache.has(code)) return codeCache.get(code)
  let idx = -1
  const m = /^08019(\d{2})(\d{2})$/.exec(code)
  if (m) {
    const list = byDistrict.get(Number(m[1]))
    const cand = list?.[Number(m[2]) - 1]
    if (cand != null) idx = cand
  }
  // the code is authoritative, but if the name disagrees try to match by name instead
  if (idx < 0 || norm(BARRIS[idx].n) !== norm(name)) {
    const byName = BARRIS.findIndex((b) => norm(b.n) === norm(name))
    if (byName >= 0) idx = byName
    else if (idx >= 0) nameWarnings.add(`${code} «${name}» → ${BARRIS[idx].n}`)
  }
  codeCache.set(code, idx)
  return idx
}

// ---- tiny CSV splitter (fields may be quoted and contain commas)
function split(line) {
  if (line.indexOf('"') < 0) return line.split(',')
  const out = []
  let cur = ''
  let q = false
  for (let k = 0; k < line.length; k++) {
    const c = line[k]
    if (q) {
      if (c === '"') { if (line[k + 1] === '"') { cur += '"'; k++ } else q = false }
      else cur += c
    } else if (c === '"') q = true
    else if (c === ',') { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out
}

// ---- accumulators: per period, per segment, per weekday → Float64Array(N*N); plus distinct dates per weekday
const periods = new Map()
function acc(id) {
  if (!periods.has(id)) {
    periods.set(id, {
      sums: SEGMENTS.map(() => Array.from({ length: 5 }, () => new Float64Array(N * N))),
      dates: Array.from({ length: 5 }, () => new Set()),
    })
  }
  return periods.get(id)
}

const report = { files: 0, rows: 0, used: 0, weekend: 0, badValue: 0, unknownBarrio: new Map(), unknownSegment: new Map() }

async function processFile(file) {
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity })
  let idx = null
  const weekdayOf = new Map() // date string → 0..4 (or -1 weekend)
  for await (let line of rl) {
    if (!line) continue
    if (!idx) {
      const h = split(line.replace(/^﻿/, '')).map((x) => x.trim())
      idx = Object.fromEntries(h.map((x, k) => [x, k]))
      for (const col of ['day', 'origen', 'barrio_origen', 'barrio_origen_name', 'barrio_destino', 'barrio_destino_name', 'viajes']) {
        if (idx[col] == null) throw new Error(`${path.basename(file)}: falta la columna «${col}»`)
      }
      continue
    }
    report.rows++
    const r = split(line)
    const day = r[idx.day]
    let wd = weekdayOf.get(day)
    if (wd == null) {
      const [y, mo, d] = day.split('-').map(Number)
      const js = new Date(Date.UTC(y, mo - 1, d)).getUTCDay() // 0 = Sunday
      wd = js === 0 || js === 6 ? -1 : js - 1
      weekdayOf.set(day, wd)
    }
    if (wd < 0) { report.weekend++; continue }
    const seg = SEGMENTS.indexOf(r[idx.origen])
    if (seg < 0) { report.unknownSegment.set(r[idx.origen], (report.unknownSegment.get(r[idx.origen]) || 0) + 1); continue }
    const o = barrioIndex(r[idx.barrio_origen], r[idx.barrio_origen_name])
    const de = barrioIndex(r[idx.barrio_destino], r[idx.barrio_destino_name])
    if (o < 0 || de < 0) {
      const bad = o < 0 ? `${r[idx.barrio_origen]} ${r[idx.barrio_origen_name]}` : `${r[idx.barrio_destino]} ${r[idx.barrio_destino_name]}`
      report.unknownBarrio.set(bad, (report.unknownBarrio.get(bad) || 0) + 1)
      continue
    }
    const v = Number(String(r[idx.viajes]).replace(',', '.'))
    if (!Number.isFinite(v) || v < 0) { report.badValue++; continue }
    const month = day.slice(0, 7)
    for (const id of [month, day.slice(0, 4), 'all']) {
      const A = acc(id)
      A.sums[seg][wd][o * N + de] += v
      A.dates[wd].add(day)
    }
    report.used++
  }
  report.files++
}

const files = fs.readdirSync(RAW, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => path.join(RAW, d.name))
  .flatMap((dir) => fs.readdirSync(dir).filter((f) => /^movilidad_barrios_\d{4}-\d{2}_origen\.csv$/.test(f)).map((f) => path.join(dir, f)))
  .sort()
if (!files.length) { console.error(`No hay ficheros movilidad_barrios_*_origen.csv en ${RAW}`); process.exit(1) }

const t0 = Date.now()
for (const f of files) {
  process.stdout.write(`· ${path.basename(f)} … `)
  await processFile(f)
  console.log(`ok (${((Date.now() - t0) / 1000).toFixed(0)} s)`)
}

fs.mkdirSync(OUT, { recursive: true })
const labelOf = (id) => {
  if (id === 'all') return 'Todos los meses'
  if (/^\d{4}$/.test(id)) return `Año ${id}`
  const [y, m] = id.split('-')
  return `${MONTHS[Number(m) - 1][0].toUpperCase()}${MONTHS[Number(m) - 1].slice(1)} ${y}`
}
const index = []
const order = [...periods.keys()].sort((a, b) => (a === 'all' ? -1 : b === 'all' ? 1 : a.length !== b.length ? a.length - b.length : a.localeCompare(b)))
for (const id of order) {
  const A = periods.get(id)
  const nDays = A.dates.map((s) => s.size)
  const seg = {}
  SEGMENTS.forEach((name, s) => {
    seg[name] = A.sums[s].map((M, d) => Array.from(M, (v) => (nDays[d] ? Math.round((v / nDays[d]) * 10) / 10 : 0)))
  })
  const file = `${id}.json`
  fs.writeFileSync(path.join(OUT, file), JSON.stringify({ id, label: labelOf(id), n: N, nDays, segments: SEGMENTS, seg }))
  const kind = id === 'all' ? 'all' : id.length === 4 ? 'year' : 'month'
  index.push({ id, label: labelOf(id), kind, file, nDays })
}
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({ generated: new Date().toISOString(), segments: SEGMENTS, periods: index }, null, 1))

console.log(`\nFicheros leídos: ${report.files} · filas: ${report.rows.toLocaleString('es-ES')} · usadas: ${report.used.toLocaleString('es-ES')} · fin de semana: ${report.weekend.toLocaleString('es-ES')} · valores no válidos: ${report.badValue}`)
if (report.unknownSegment.size) console.log('Tipos de viajero desconocidos:', Object.fromEntries(report.unknownSegment))
if (report.unknownBarrio.size) console.log('Barrios sin reconocer:', Object.fromEntries([...report.unknownBarrio].slice(0, 20)))
if (nameWarnings.size) console.log('Nombres que no coinciden con el código (se usa el código):', [...nameWarnings])
console.log(`Escritos ${index.length} periodos en ${OUT}`)
