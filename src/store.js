import { create } from 'zustand'
import { BARRIOS } from './model/geo.js'
import { simulateWeek, STEPS } from './model/simulate.js'
import { deriveDataset } from './model/derive.js'
import { loadIndex, loadPeriod, cubeFor, segmentLabel } from './model/realData.js'

export const BASE_ATTRS = { pop: BARRIOS.map((b) => b.pop), rest: BARRIOS.map((b) => b.rest) }
const SIM_F = simulateWeek()
export const SIMULATED = deriveDataset(SIM_F, BASE_ATTRS)

let toastId = 0
let loadSeq = 0

export const useStore = create((set, get) => ({
  // ---------- data ----------
  dataset: SIMULATED,
  attrs: BASE_ATTRS,
  importReport: null,
  // real data (preprocessed files in public/data/movilidad)
  periods: [], // [{id,label,kind,nDays}]
  period: 'all',
  segment: 'all', // 'all' | 'Residente' | 'Regional' | 'Nacional' | 'Internacional'
  dataState: 'loading', // loading | ok | error | csv

  // ---------- time (in days: 0 = Monday … 4 = Friday; fractional only while animating) ----------
  t: 0,
  playing: false,
  speed: 0.5, // days per second
  loop: true,
  tween: null, // {from,to,start,dur}

  // ---------- map view ----------
  basemap: 'satelite', // 'satelite' | 'mapa'
  layers: { labels: true, terrain: true, buildings: true, barrios: '3d', hex: false, flows: true, arcs: true, bubbles: false, pulse: true, names: true, bicing: false },
  colorMode: 'activity', // activity | delta | bubble | influence
  deltaBase: 0,
  influenceDir: 'out',
  orbit: false,
  intro: 'globe', // globe | flying | done
  nightness: 0,
  theme: 'auto', // auto | light | dark
  zoom: 2,

  // ---------- selection ----------
  sel: -1,
  hover: null, // {i, x, y} or {station, x, y}
  compareB: -1,
  hoverStudy: -1,

  // ---------- ui ----------
  panel: 'historias',
  cmdk: false,
  help: false,
  compareOpen: false,
  story: { active: false, idx: 0 },
  toasts: [],

  // ---------- live ----------
  weather: null,
  weatherState: 'idle',
  bicing: null,
  bicingState: 'idle',

  // ---------- actions ----------
  setT: (t) => set({ t: ((t % STEPS) + STEPS) % STEPS, tween: null }),
  goTo: (to, dur = 900) => {
    const from = get().t
    set({ tween: { from, to: Math.max(0, Math.min(STEPS - 1, to)), start: performance.now(), dur }, playing: false })
  },
  goDay: (d) => get().goTo(d, 900),
  stepDay: (k) => {
    const t = Math.round(get().t)
    get().goTo(((t + k) % STEPS + STEPS) % STEPS, 600)
  },
  togglePlay: () => set((s) => ({ playing: !s.playing, tween: null })),
  setSpeed: (speed) => set({ speed }),
  setLayer: (k, v) => set((s) => ({ layers: { ...s.layers, [k]: v } })),
  setBasemap: (basemap) => set({ basemap }),
  setColorMode: (colorMode) => {
    const s = get()
    if (colorMode === 'influence' && s.sel < 0) get().toast('Elige un barrio para ver adónde va su gente.', 'info')
    set({ colorMode })
  },
  setDeltaBase: (deltaBase) => set({ deltaBase }),
  setInfluenceDir: (influenceDir) => set({ influenceDir }),
  select: (i) => set((s) => ({ sel: i, compareB: i === s.compareB ? -1 : s.compareB })),
  setHover: (hover) => set({ hover }),
  setPanel: (p) => set((s) => ({ panel: s.panel === p ? null : p })),
  openPanel: (p) => set({ panel: p }),
  setTheme: (theme) => set({ theme }),
  setOrbit: (orbit) => set({ orbit }),
  setCmdk: (cmdk) => set({ cmdk }),
  setHelp: (help) => set({ help }),
  openCompare: (b) => set({ compareOpen: true, compareB: b ?? get().compareB }),
  closeCompare: () => set({ compareOpen: false }),
  setCompareB: (compareB) => set({ compareB }),
  setHoverStudy: (hoverStudy) => set({ hoverStudy }),
  setStory: (story) => set({ story }),
  loadDataset: (dataset, report, attrs) => set({ dataset, importReport: report, ...(attrs ? { attrs } : {}), ...(report?.kind === 'flows' ? { dataState: 'csv' } : {}) }),
  resetDataset: () => { set({ importReport: null, attrs: BASE_ATTRS, csv: null }); get().loadReal() },

  // An uploaded flows CSV, kept with the same shape as a preprocessed period so the traveller-type selector still works.
  csv: null,
  loadCsv: (csv, report) => {
    ++loadSeq // a real-data load still in flight must not overwrite the upload
    set({ csv, importReport: report, dataState: 'csv' })
    const seg = get().segment
    get().applyCsv(seg === 'all' || csv.segments.includes(seg) ? seg : 'all')
  },
  applyCsv: (segment) => {
    const csv = get().csv
    if (!csv) return
    const dataset = deriveDataset(cubeFor(csv, segment), get().attrs, {
      kind: 'csv',
      label: `Datos reales · ${csv.label}${segment !== 'all' ? ` · ${segmentLabel(segment)}` : ''}`,
      segment,
      nDays: csv.nDays,
    })
    set({ dataset, segment })
  },

  // Load one period / traveller type of the real data. Falls back to the simulated data if the files are missing.
  loadReal: async (period = get().period, segment = get().segment) => {
    const seq = ++loadSeq
    set({ period, segment, dataState: 'loading' })
    try {
      const idx = await loadIndex()
      if (seq !== loadSeq) return
      set({ periods: idx.periods })
      if (!idx.periods.some((p) => p.id === period)) period = idx.periods[0].id
      const p = await loadPeriod(period)
      if (seq !== loadSeq) return
      const ds = deriveDataset(cubeFor(p, segment), get().attrs, {
        kind: 'real',
        label: `${p.label} · ${segmentLabel(segment)}`,
        period: p.label,
        segment,
        nDays: p.nDays,
      })
      set({ dataset: ds, period, segment, dataState: 'ok' })
    } catch (e) {
      if (seq !== loadSeq) return
      console.warn('No se pudieron cargar los datos reales:', e)
      set({ dataset: SIMULATED, dataState: 'error' })
      get().toast('No encuentro los datos reales (public/data/movilidad). Se muestran datos simulados.', 'info')
    }
  },
  setPeriod: (period) => get().loadReal(period, get().segment),
  setSegment: (segment) => (get().dataState === 'csv' ? get().applyCsv(segment) : get().loadReal(get().period, segment)),

  toast: (text, kind = 'ok') => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts, { id, text, kind }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 4200)
  },
}))

// Effective UI theme. The data has no hours, so there is no day/night cycle: 'auto' means light.
export const selectDark = (s) => s.theme === 'dark'
