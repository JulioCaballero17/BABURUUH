// Builds public/data/movilidad/summary.json from the per-period files written by
// preprocess-mobility.mjs. For every period (month, year, "all") and traveller type it keeps
// the AVERAGE WEEKDAY arrivals and departures of each barrio (73 numbers each).
// The app uses it for the monthly evolution chart and for comparing two periods,
// without having to download every period file.
//
// Usage: node scripts/build-summary.mjs [data-folder]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIR = process.argv[2] || path.join(__dirname, '..', 'public', 'data', 'movilidad')

export function buildSummary(dir) {
  const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'))
  const round = (v) => Math.round(v * 10) / 10
  const out = { generated: new Date().toISOString(), n: 73, segments: index.segments, periods: [], arr: {}, dep: {} }
  for (const p of index.periods) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, p.file), 'utf8'))
    const N = data.n
    const nDays = data.nDays
    const totalDays = nDays.reduce((a, b) => a + b, 0) || 1
    out.arr[p.id] = {}
    out.dep[p.id] = {}
    for (const seg of data.segments) {
      const arr = new Float64Array(N)
      const dep = new Float64Array(N)
      data.seg[seg].forEach((M, d) => {
        const w = nDays[d] / totalDays // weekday average weighted by how many of each weekday the period has
        for (let i = 0; i < N; i++) {
          for (let j = 0; j < N; j++) {
            const v = M[i * N + j] * w
            if (!v) continue
            dep[i] += v
            arr[j] += v
          }
        }
      })
      out.arr[p.id][seg] = Array.from(arr, round)
      out.dep[p.id][seg] = Array.from(dep, round)
    }
    out.periods.push({ id: p.id, label: p.label, kind: p.kind, nDays })
  }
  fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(out))
  return out
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const s = buildSummary(DIR)
  console.log(`summary.json: ${s.periods.length} periodos · ${s.segments.length} tipos de viajero`)
}
