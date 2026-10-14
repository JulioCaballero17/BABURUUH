import { create } from 'zustand'
import { BARRIOS } from './model/geo.js'
import { simulateWeek } from './model/simulate.js'
import { deriveDataset } from './model/derive.js'

export const BASE_ATTRS = { pop: BARRIOS.map((b) => b.pop), rest: BARRIOS.map((b) => b.rest) }
const SIM_F = simulateWeek()
export const SIMULATED = deriveDataset(SIM_F, BASE_ATTRS)

let toastId = 0

export const useStore = create((set, get) => ({
  // ---------- data ----------
  dataset: SIMULATED,
  attrs: BASE_ATTRS,
  importReport: null,

  // ---------- time ----------
  t: 9,
  playing: false,
  speed: 1.5, // simulated hours per second
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
  setT: (t) => set({ t: ((t % 120) + 120) % 120, tween: null }),
  goTo: (to, dur = 900) => {
    const from = get().t
    set({ tween: { from, to: Math.max(0, Math.min(119.99, to)), start: performance.now(), dur }, playing: false })
  },
  goDay: (d) => {
    const h = get().t % 24
    get().goTo(d * 24 + h, 1100)
  },
  stepHour: (k) => {
    const t = get().t
    get().goTo(k > 0 ? Math.floor(t) + k : Math.ceil(t) + k, 350)
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
  loadDataset: (dataset, report, attrs) => set({ dataset, importReport: report, ...(attrs ? { attrs } : {}) }),
  resetDataset: () => set({ dataset: SIMULATED, importReport: null, attrs: BASE_ATTRS }),

  toast: (text, kind = 'ok') => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts, { id, text, kind }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 4200)
  },
}))

// Effective UI theme (light glass by day, dark glass by night unless pinned)
export const selectDark = (s) => (s.theme === 'auto' ? s.nightness > 0.5 : s.theme === 'dark')
