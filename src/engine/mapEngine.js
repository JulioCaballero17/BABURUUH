// Imperative map engine: MapLibre (satellite, terrain, buildings, data extrusions) + deck.gl overlay.
// It runs its own animation loop and reads the zustand store directly, so React only renders UI chrome.
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { useStore, selectDark } from '../store.js'
import { buildStyle, rampExpr } from './mapStyle.js'
import { buildDeckLayers, buildTrips } from './deckLayers.js'
import { BARRIOS, N, HEXES } from '../model/geo.js'
import { HOURS } from '../model/simulate.js'
import { RAMP_ACTIVITY, RAMP_DELTA, RAMP_BUBBLE, RAMP_INFLUENCE, hexToRgb, mix, rgbStr } from '../lib/colors.js'
import { sunAt, dayOf } from '../lib/week.js'
import { clamp, smoothstep } from '../lib/format.js'

const TERRAIN = { source: 'terrain', exaggeration: 1.25 }
const MAX_H = 950
const MAX_HEX = 1250
const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const isMobile = () => window.innerWidth < 760
export const HOME = () => (isMobile()
  ? { center: [2.168, 41.392], zoom: 11.15, pitch: 48, bearing: -28 }
  : { center: [2.161, 41.393], zoom: 12.25, pitch: 57, bearing: -28 })

export const PRESETS = {
  panoramica: { label: 'Panorámica', cam: () => HOME() },
  cenital: { label: 'Cenital', cam: () => ({ center: [2.163, 41.395], zoom: isMobile() ? 11 : 12.1, pitch: 0, bearing: 0 }) },
  mar: { label: 'Desde el mar', cam: () => ({ center: [2.178, 41.393], zoom: 12.7, pitch: 72, bearing: -42 }) },
  collserola: { label: 'Desde Collserola', cam: () => ({ center: [2.152, 41.4], zoom: 12.9, pitch: 74, bearing: 138 }) },
  litoral: { label: 'Litoral', cam: () => ({ center: [2.2, 41.398], zoom: 13.4, pitch: 70, bearing: 52 }) },
}

let map = null
let overlay = null
let raf = 0
const E = {
  ready: false,
  elev: new Float32Array(N),
  elevKey: '',
  trips: null,
  tripsKey: '',
  growStart: 0,
  interacting: false,
  lastInteraction: 0,
  prevNow: 0,
  stateKey: '',
  hexKey: '',
  lightKey: '',
  discrete: null,
  flying: false,
  hovered: -1,
}

export const getMap = () => map

/* ------------------------------------------------------------------ init */
export function initMap(container, startCam) {
  map = new maplibregl.Map({
    container,
    style: buildStyle(),
    center: [12, 33],
    zoom: isMobile() ? 0.9 : 1.55,
    pitch: 0,
    bearing: 0,
    maxPitch: 80,
    attributionControl: false,
    fadeDuration: 180,
    canvasContextAttributes: { antialias: true, preserveDrawingBuffer: true },
  })
  map.addControl(new maplibregl.AttributionControl({ compact: false, customAttribution: 'Tiempo: Open-Meteo · Bicing: CityBikes' }), 'bottom-left')
  map.on('load', () => {
    E.ready = true
    wireEvents()
    applyDiscrete(useStore.getState(), true)
    if (startCam) E.startCam = startCam
  })
  map.on('movestart', (e) => { if (e.originalEvent) E.interacting = true })
  map.on('moveend', () => { E.interacting = false; E.lastInteraction = performance.now() })
  map.on('idle', sampleElevation)
  E.prevNow = performance.now()
  raf = requestAnimationFrame(frame)
  return map
}

export function destroyMap() {
  cancelAnimationFrame(raf)
  overlay?.finalize?.()
  map?.remove()
  map = null
  overlay = null
  E.ready = false
}

function wireEvents() {
  const pickLayers = () => ['bicing', 'hex-ext', 'barrios-3d', 'barrios-fill'].filter((id) => map.getLayer(id) && map.getLayoutProperty(id, 'visibility') !== 'none')
  const pick = (point) => {
    const f = map.queryRenderedFeatures(point, { layers: pickLayers() })[0]
    if (!f) return null
    if (f.layer.id === 'bicing') return { station: f.properties }
    const i = f.layer.id === 'hex-ext' ? f.properties.b : Number(f.id)
    return { i, hex: f.layer.id === 'hex-ext' ? Number(f.id) : undefined }
  }
  map.on('mousemove', (e) => {
    const s = useStore.getState()
    if (s.intro !== 'done') return
    const p = pick(e.point)
    map.getCanvas().style.cursor = p ? 'pointer' : ''
    if (!p) { if (s.hover) s.setHover(null); return }
    s.setHover({ ...p, x: e.point.x, y: e.point.y })
  })
  map.getCanvas().addEventListener('mouseleave', () => useStore.getState().setHover(null))
  map.on('click', (e) => {
    const s = useStore.getState()
    if (s.intro !== 'done') return
    const p = pick(e.point)
    if (p && p.i != null) selectBarrio(p.i === s.sel ? -1 : p.i)
    else if (!p && s.sel >= 0) selectBarrio(-1)
  })
}

/* ------------------------------------------------------------------ camera */
function padding() {
  const s = useStore.getState()
  if (isMobile()) return { top: 140, bottom: s.sel >= 0 ? window.innerHeight * 0.5 : 170, left: 20, right: 20 }
  return { top: 100, bottom: 170, left: s.panel ? 420 : 90, right: s.sel >= 0 ? 450 : 90 }
}

export function flyTo(cam, duration = 2400) {
  if (!map) return
  E.flying = true
  map.flyTo({ ...cam, duration: reduceMotion ? 0 : duration, essential: true, curve: 1.3, padding: padding() })
  map.once('moveend', () => { E.flying = false })
}
export function flyHome() { flyTo(HOME(), 2000) }
export function flyPreset(key) { const p = PRESETS[key]; if (p) flyTo(p.cam(), 2600) }

export function selectBarrio(i, { fly = true } = {}) {
  const s = useStore.getState()
  s.select(i)
  if (i >= 0 && fly) {
    const b = BARRIOS[i]
    const bearing = map ? map.getBearing() + 14 : -20
    flyTo({ center: b.c, zoom: Math.max(13.15, Math.min(14.2, 14.6 - Math.log2(b.area + 1) * 0.6)), pitch: 62, bearing }, 2200)
  }
}

export function zoomBy(d) { map?.easeTo({ zoom: map.getZoom() + d, duration: 350 }) }
export function resetNorth() { map?.easeTo({ bearing: 0, duration: 600 }) }
export function togglePitch() { if (!map) return; map.easeTo({ pitch: map.getPitch() > 20 ? 0 : 58, duration: 800 }) }
export const getBearing = () => (map ? map.getBearing() : 0)
export const getCamera = () => (map ? { center: map.getCenter().toArray(), zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() } : null)

/* ------------------------------------------------------------------ intro */
export function startIntro() {
  const s = useStore.getState()
  if (!map || s.intro !== 'globe') return
  useStore.setState({ intro: 'flying' })
  if (s.layers.terrain) map.setTerrain(TERRAIN)
  const cam = E.startCam || HOME()
  if (reduceMotion) { map.jumpTo(cam); finishIntro(); return }
  map.flyTo({ ...cam, duration: 7600, curve: 1.55, speed: 0.6, essential: true })
  map.once('moveend', finishIntro)
}
export function skipIntro() {
  if (!map) return
  const s = useStore.getState()
  if (s.intro === 'done') return
  map.stop()
  if (s.layers.terrain) map.setTerrain(TERRAIN)
  map.jumpTo(E.startCam || HOME())
  finishIntro()
}
function finishIntro() {
  if (useStore.getState().intro === 'done') return
  map.setProjection({ type: 'mercator' })
  overlay = new MapboxOverlay({ interleaved: true, layers: [] })
  map.addControl(overlay)
  E.growStart = performance.now()
  useStore.setState({ intro: 'done' })
}

/* ------------------------------------------------------------------ elevation */
function sampleElevation() {
  if (!map || !E.ready) return
  const s = useStore.getState()
  if (!s.layers.terrain || !map.getTerrain()) {
    if (E.elevKey !== 'flat') { E.elev = new Float32Array(N); E.elevKey = 'flat'; E.tripsKey = '' }
    return
  }
  const arr = new Float32Array(N)
  let ok = 0
  for (let i = 0; i < N; i++) {
    const v = map.queryTerrainElevation(BARRIOS[i].c)
    if (v != null && Number.isFinite(v)) { arr[i] = v; ok++ }
  }
  if (ok < N * 0.8) return
  const key = Array.from(arr, (v) => Math.round(v / 5)).join(',')
  if (key !== E.elevKey) { E.elev = arr; E.elevKey = key; E.tripsKey = '' }
}

/* ------------------------------------------------------------------ discrete state → style */
const RAMPS = { activity: RAMP_ACTIVITY, delta: RAMP_DELTA, bubble: RAMP_BUBBLE, influence: RAMP_INFLUENCE }
function vis(id, on) { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none') }

function applyDiscrete(s, force = false) {
  if (!map || !E.ready) return
  const prev = E.discrete || {}
  const dark = selectDark(s)
  const L = s.layers
  if (force || prev.basemap !== s.basemap || prev.dark !== dark) {
    vis('satellite', s.basemap === 'satelite')
    vis('basemap-light', s.basemap === 'mapa' && !dark)
    vis('basemap-dark', s.basemap === 'mapa' && dark)
  }
  if (force || prev.layers !== L || prev.intro !== s.intro) {
    vis('buildings', L.buildings)
    vis('labels-light', L.labels && s.basemap === 'satelite')
    vis('labels-dark', L.labels && s.basemap === 'satelite')
    vis('barrio-names', L.names)
    vis('bicing', L.bicing)
    vis('hex-ext', L.hex)
    vis('barrios-3d', L.barrios === '3d' && !L.hex)
    vis('barrios-fill', L.barrios !== 'off')
    vis('barrios-line', L.barrios !== 'off' || L.hex)
    // keep the same expression shape (zoom × feature-state) in every mode; MapLibre cannot
    // transition between expressions of different kinds
    const flat = L.barrios === '2d' || L.hex
    const [z0, z1] = flat ? [L.hex ? 0.16 : 0.6, L.hex ? 0.16 : 0.6] : [0.04, 0.42]
    const dimOp = (v) => ['case', ['boolean', ['feature-state', 'dim'], false], v * 0.12, v]
    map.setPaintProperty('barrios-fill', 'fill-opacity', ['interpolate', ['linear'], ['zoom'], 12.6, dimOp(z0), 14.6, dimOp(z1)])
    if (s.intro !== 'globe' && prev.terrain !== L.terrain) {
      map.setTerrain(L.terrain ? TERRAIN : null)
      E.elevKey = ''
      if (!L.terrain) { E.elev = new Float32Array(N); E.elevKey = 'flat'; E.tripsKey = '' }
    }
  }
  if (force || prev.colorMode !== s.colorMode) {
    const ramp = RAMPS[s.colorMode] || RAMP_ACTIVITY
    map.setPaintProperty('barrios-fill', 'fill-color', rampExpr(ramp))
    map.setPaintProperty('barrios-3d', 'fill-extrusion-color', rampExpr(ramp))
    map.setPaintProperty('hex-ext', 'fill-extrusion-color', rampExpr(s.colorMode === 'delta' ? RAMP_DELTA : RAMP_ACTIVITY))
  }
  if (force || prev.bicing !== s.bicing) {
    const src = map.getSource('bicing')
    if (src && s.bicing) src.setData(s.bicing.geojson)
  }
  E.discrete = { basemap: s.basemap, dark, layers: L, colorMode: s.colorMode, bicing: s.bicing, intro: s.intro, terrain: L.terrain }
  E.lightKey = ''
}

/* ------------------------------------------------------------------ lighting from the real sun */
const C = {
  bldDay: hexToRgb('#DCD6CA'), bldNight: hexToRgb('#1A2331'),
  lightDay: hexToRgb('#FFF2DC'), lightNight: hexToRgb('#8EA4D4'),
  skyDay: hexToRgb('#86AED6'), skyNight: hexToRgb('#050A14'), skyDusk: hexToRgb('#3F4D7E'),
  horDay: hexToRgb('#E8DDCB'), horNight: hexToRgb('#17233A'), horDusk: hexToRgb('#E59A72'),
  fogDay: hexToRgb('#C7D0D8'), fogNight: hexToRgb('#0A111D'), fogDusk: hexToRgb('#6B5A6E'),
}
function applyLighting(sun, s) {
  const n = sun.nightness
  const key = `${Math.round(n * 60)}|${Math.round(sun.bearing / 3)}|${s.layers.labels}|${s.basemap}`
  if (key === E.lightKey) return
  E.lightKey = key
  const dusk = Math.exp(-((sun.altitude - 1) ** 2) / 50)
  map.setPaintProperty('satellite', 'raster-brightness-max', 1 - 0.62 * n)
  map.setPaintProperty('satellite', 'raster-saturation', -0.1 - 0.45 * n + 0.1 * dusk)
  map.setPaintProperty('satellite', 'raster-contrast', 0.05 + 0.12 * n)
  map.setPaintProperty('labels-light', 'raster-opacity', (1 - n) * 0.92)
  map.setPaintProperty('labels-dark', 'raster-opacity', n * 0.92)
  map.setPaintProperty('buildings', 'fill-extrusion-color', rgbStr(mix(C.bldDay, C.bldNight, n)))
  map.setLight({
    anchor: 'map',
    position: [1.3, sun.bearing, clamp(90 - Math.max(sun.altitude, -10), 18, 82)],
    color: rgbStr(mix(C.lightDay, C.lightNight, n)),
    intensity: 0.44 - 0.16 * n,
  })
  const pick = (d, k, u) => rgbStr(mix(mix(d, u, dusk * (1 - n * 0.6)), k, n * (1 - dusk * 0.4)))
  map.setSky({
    'sky-color': pick(C.skyDay, C.skyNight, C.skyDusk),
    'horizon-color': pick(C.horDay, C.horNight, C.horDusk),
    'fog-color': pick(C.fogDay, C.fogNight, C.fogDusk),
    'sky-horizon-blend': 0.55,
    'horizon-fog-blend': 0.6,
    'fog-ground-blend': 0.3,
    'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 8, 1, 11, 0],
  })
  map.setPaintProperty('barrios-line', 'line-color', n > 0.5 ? 'rgba(214,226,240,0.55)' : 'rgba(255,255,255,0.7)')
}

/* ------------------------------------------------------------------ per-frame data → feature state */
function interp(series, t) {
  const t0 = Math.floor(t) % HOURS
  const t1 = (t0 + 1) % HOURS
  const f = t - Math.floor(t)
  return [series[t0], series[t1], f]
}

function updateBarrios(s, t, grow) {
  const ds = s.dataset
  const [D0, D1, f] = interp(ds.DENS, t)
  const day = dayOf(t)
  const mode = s.colorMode
  const sel = s.sel
  let shares = null
  let shareMax = 1
  if (mode === 'influence' && sel >= 0) {
    const [F0, F1] = interp(ds.F, t)
    shares = new Float32Array(N)
    for (let j = 0; j < N; j++) {
      const a = s.influenceDir === 'in' ? F0[j * N + sel] * (1 - f) + F1[j * N + sel] * f : F0[sel * N + j] * (1 - f) + F1[sel * N + j] * f
      shares[j] = a
    }
    shareMax = Math.max(...shares) || 1
  }
  let bMin = 1
  let bMax = 0
  if (mode === 'bubble') ds.metrics.forEach((m) => { bMin = Math.min(bMin, m.bub[day]); bMax = Math.max(bMax, m.bub[day]) })
  const baseT = s.deltaBase * 24 + (t % 24)
  const [R0, R1, rf] = interp(ds.DENS, baseT)
  const hov = s.hover?.i ?? -1
  for (let i = 0; i < N; i++) {
    const dens = D0[i] * (1 - f) + D1[i] * f
    const base = clamp(dens / ds.densRef)
    let v
    let dim = false
    if (mode === 'delta') {
      const ref = R0[i] * (1 - rf) + R1[i] * rf
      v = (clamp(Math.log2((dens + 0.5) / (ref + 0.5)) / 1.1, -1, 1) + 1) / 2
    } else if (mode === 'bubble') {
      v = bMax > bMin ? (ds.metrics[i].bub[day] - bMin) / (bMax - bMin) : 0
    } else if (shares) {
      v = Math.sqrt(shares[i] / shareMax)
      dim = shares[i] / shareMax < 0.015
    } else {
      v = Math.pow(base, 0.7)
    }
    const h = Math.pow(base, 0.85) * MAX_H * grow + 6
    map.setFeatureState({ source: 'barrios', id: i }, { v, h: dim ? 6 : h, sel: i === sel, hov: i === hov, dim })
  }
}

function updateHex(s, t, grow) {
  const ds = s.dataset
  const [D0, D1, f] = interp(ds.DENS, t)
  const dens = new Float32Array(N)
  for (let i = 0; i < N; i++) dens[i] = D0[i] * (1 - f) + D1[i] * f
  const delta = s.colorMode === 'delta'
  let ref = null
  if (delta) {
    const [R0, R1, rf] = interp(ds.DENS, s.deltaBase * 24 + (t % 24))
    ref = new Float32Array(N)
    for (let i = 0; i < N; i++) ref[i] = R0[i] * (1 - rf) + R1[i] * rf
  }
  for (const hx of HEXES) {
    let sw = 0
    let sv = 0
    let sr = 0
    for (const [j, w] of hx.weights) { sw += w; sv += dens[j] * w; if (ref) sr += ref[j] * w }
    const val = (0.55 * dens[hx.b] + 0.45 * (sw ? sv / sw : 0)) * (0.82 + 0.36 * hx.noise)
    const base = clamp(val / ds.densRef)
    let v = Math.pow(base, 0.7)
    if (ref) {
      const rv = (0.55 * ref[hx.b] + 0.45 * (sw ? sr / sw : 0)) * (0.82 + 0.36 * hx.noise)
      v = (clamp(Math.log2((val + 0.5) / (rv + 0.5)) / 1.1, -1, 1) + 1) / 2
    }
    map.setFeatureState({ source: 'hex', id: hx.k }, { v, h: Math.pow(base, 0.8) * MAX_HEX * grow + 4 })
  }
}

/* ------------------------------------------------------------------ main loop */
function advanceTime(s, now, dt) {
  if (s.tween) {
    const e = clamp((now - s.tween.start) / s.tween.dur)
    const k = e < 0.5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2
    const t = s.tween.from + (s.tween.to - s.tween.from) * k
    useStore.setState(e >= 1 ? { t: s.tween.to, tween: null } : { t })
  } else if (s.playing) {
    let t = s.t + dt * s.speed
    if (t >= HOURS) {
      if (s.loop) t -= HOURS
      else { t = HOURS - 0.01; useStore.setState({ playing: false }) }
    }
    useStore.setState({ t })
  }
}

function frame(now) {
  raf = requestAnimationFrame(frame)
  const dt = Math.min(0.05, (now - E.prevNow) / 1000)
  E.prevNow = now
  let s = useStore.getState()
  advanceTime(s, now, dt)
  s = useStore.getState()
  if (!map || !E.ready) return

  if (s.intro === 'globe' && !reduceMotion) {
    const c = map.getCenter()
    map.setCenter([c.lng - dt * 2.6, c.lat])
  }

  // discrete style changes
  const d = E.discrete
  if (!d || d.basemap !== s.basemap || d.layers !== s.layers || d.colorMode !== s.colorMode || d.bicing !== s.bicing || d.intro !== s.intro || d.dark !== selectDark(s)) applyDiscrete(s)

  const t = s.t
  const sun = sunAt(t)
  if (Math.abs(sun.nightness - s.nightness) > 0.015) useStore.setState({ nightness: sun.nightness })
  applyLighting(sun, s)

  const grow = s.intro === 'done' ? (reduceMotion ? 1 : smoothstep((now - E.growStart - 300) / 2600)) : 0
  const key = `${t.toFixed(3)}|${s.colorMode}|${s.sel}|${s.hover?.i ?? -1}|${s.dataset.version}|${s.deltaBase}|${s.influenceDir}|${grow.toFixed(3)}`
  if (key !== E.stateKey) { E.stateKey = key; updateBarrios(s, t, grow) }
  if (s.layers.hex) {
    const hk = `${t.toFixed(3)}|${s.dataset.version}|${grow.toFixed(3)}|${s.colorMode}|${s.deltaBase}`
    if (hk !== E.hexKey) { E.hexKey = hk; updateHex(s, t, grow) }
  }

  // trips need rebuilding when data or terrain elevations change
  const tk = `${s.dataset.version}|${E.elevKey}`
  if (s.intro === 'done' && tk !== E.tripsKey) { E.tripsKey = tk; E.trips = buildTrips(s.dataset, E.elev) }

  const zoom = map.getZoom()
  if (Math.abs(zoom - s.zoom) > 0.05) useStore.setState({ zoom })
  if (overlay) overlay.setProps({ layers: buildDeckLayers({ s, trips: E.trips, elev: E.elev, now, zoom, grow }) })

  // adaptive quality: on slow GPUs, drop the glass blur (the most expensive effect over a live map)
  if (s.intro === 'done' && !E.qualityDone) {
    const since = now - E.growStart
    if (since > 1500) (E.samples ||= []).push(dt)
    if (since > 6000 && E.samples?.length > 5) {
      E.qualityDone = true
      const sorted = [...E.samples].sort((x, y) => x - y)
      const med = sorted[Math.floor(sorted.length / 2)]
      if (med > 0.045) {
        document.documentElement.classList.add('lowfx')
        map.setPixelRatio?.(1)
        useStore.getState().toast('Modo ligero activado para que el mapa vaya fluido en este equipo.', 'info')
      }
    }
  }

  if (s.orbit && s.intro === 'done' && !E.interacting && !E.flying && now - E.lastInteraction > 1200) {
    map.setBearing(map.getBearing() + dt * 4.5)
  }
}

/* ------------------------------------------------------------------ capture */
export async function capturePNG({ title, subtitle, legend }) {
  if (!map) return null
  map.triggerRepaint()
  await new Promise((r) => map.once('render', r))
  const src = map.getCanvas()
  const W = src.width
  const H = src.height
  const k = W / src.clientWidth
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  g.drawImage(src, 0, 0)
  const grad = g.createLinearGradient(0, H - 220 * k, 0, H)
  grad.addColorStop(0, 'rgba(6,10,16,0)')
  grad.addColorStop(1, 'rgba(6,10,16,0.82)')
  g.fillStyle = grad
  g.fillRect(0, H - 220 * k, W, 220 * k)
  g.fillStyle = '#F2EEE6'
  g.font = `italic ${44 * k}px "Instrument Serif", Georgia, serif`
  g.fillText(title, 36 * k, H - 74 * k)
  g.font = `500 ${15 * k}px "Geist Variable", system-ui, sans-serif`
  g.fillStyle = 'rgba(242,238,230,0.78)'
  g.fillText(subtitle, 38 * k, H - 44 * k)
  if (legend) {
    const lw = 220 * k
    const lx = W - lw - 36 * k
    const ly = H - 64 * k
    const lg = g.createLinearGradient(lx, 0, lx + lw, 0)
    legend.ramp.forEach((col, idx) => lg.addColorStop(idx / (legend.ramp.length - 1), col))
    g.fillStyle = lg
    g.fillRect(lx, ly, lw, 8 * k)
    g.fillStyle = 'rgba(242,238,230,0.8)'
    g.font = `500 ${12 * k}px "Geist Variable", system-ui, sans-serif`
    g.fillText(legend.title, lx, ly - 10 * k)
    g.fillText(legend.min, lx, ly + 26 * k)
    const mw = g.measureText(legend.max).width
    g.fillText(legend.max, lx + lw - mw, ly + 26 * k)
  }
  g.font = `400 ${11 * k}px "Geist Mono Variable", monospace`
  g.fillStyle = 'rgba(242,238,230,0.55)'
  g.fillText('Imágenes © Esri · Relieve AWS Terrain · Edificios © OpenStreetMap', 38 * k, H - 18 * k)
  return c.toDataURL('image/png')
}
