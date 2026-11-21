// Loads the real mobility data produced by scripts/preprocess-mobility.mjs
// (public/data/movilidad/index.json + one JSON per period) and turns it into the
// daily origin→destination cube used by the app.
import { N } from './geo.js'
import { STEPS } from './simulate.js'

const BASE = `${import.meta.env.BASE_URL}data/movilidad/`

// Traveller types in the source data. 'all' sums them.
export const SEGMENTS = [
  { value: 'all', label: 'Todos', long: 'Todos los viajeros' },
  { value: 'Residente', label: 'Residentes', long: 'Residentes' },
  { value: 'Regional', label: 'Regional', long: 'Visitantes de Cataluña' },
  { value: 'Nacional', label: 'Nacional', long: 'Visitantes del resto de España' },
  { value: 'Internacional', label: 'Internac.', long: 'Visitantes internacionales' },
]
export const segmentLabel = (v) => SEGMENTS.find((s) => s.value === v)?.long || v

let indexPromise = null
const cache = new Map()

export function loadIndex() {
  indexPromise ||= fetch(`${BASE}index.json`).then((r) => {
    if (!r.ok) throw new Error(`index.json: ${r.status}`)
    return r.json()
  }).catch((e) => { indexPromise = null; throw e })
  return indexPromise
}

export async function loadPeriod(id) {
  if (cache.has(id)) return cache.get(id)
  const idx = await loadIndex()
  const p = idx.periods.find((x) => x.id === id)
  if (!p) throw new Error(`Periodo desconocido: ${id}`)
  const r = await fetch(`${BASE}${p.file}`)
  if (!r.ok) throw new Error(`${p.file}: ${r.status}`)
  const json = await r.json()
  cache.set(id, json)
  return json
}

// Daily cube (STEPS × N*N) for one traveller type, or the sum of all of them.
export function cubeFor(period, segment = 'all') {
  const names = segment === 'all' ? period.segments : [segment]
  return Array.from({ length: STEPS }, (_, d) => {
    const M = new Float32Array(N * N)
    for (const name of names) {
      const src = period.seg[name]?.[d]
      if (!src) continue
      for (let k = 0; k < M.length; k++) M[k] += src[k]
    }
    return M
  })
}
