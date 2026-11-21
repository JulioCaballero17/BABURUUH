// Shareable state in the URL hash: day, period, traveller type, selected barrio, colour mode, layers and camera.
const LAYER_KEYS = ['labels', 'terrain', 'buildings', 'hex', 'flows', 'arcs', 'bubbles', 'pulse', 'names', 'bicing']

export function readHash() {
  const h = window.location.hash.replace(/^#/, '')
  if (!h) return null
  const p = new URLSearchParams(h)
  const out = {}
  if (p.has('d')) { const d = Number(p.get('d')); if (Number.isInteger(d) && d >= 0 && d <= 4) out.t = d }
  if (p.has('p') && /^[\w-]{1,12}$/.test(p.get('p'))) out.period = p.get('p')
  if (p.has('s') && ['all', 'Residente', 'Regional', 'Nacional', 'Internacional'].includes(p.get('s'))) out.segment = p.get('s')
  if (p.has('b')) { const b = Number(p.get('b')); if (Number.isInteger(b) && b >= 0 && b < 73) out.sel = b }
  if (p.has('m') && ['activity', 'delta', 'bubble', 'influence'].includes(p.get('m'))) out.colorMode = p.get('m')
  if (p.has('base')) out.deltaBase = Math.max(0, Math.min(4, Number(p.get('base')) || 0))
  if (p.has('v') && ['3d', '2d', 'off'].includes(p.get('v'))) out.barrios = p.get('v')
  if (p.has('l')) {
    const bits = p.get('l')
    out.layers = {}
    LAYER_KEYS.forEach((k, i) => { if (bits[i] === '1' || bits[i] === '0') out.layers[k] = bits[i] === '1' })
  }
  if (p.has('cam')) {
    const c = p.get('cam').split(',').map(Number)
    if (c.length === 5 && c.every(Number.isFinite)) out.cam = { center: [c[0], c[1]], zoom: c[2], pitch: c[3], bearing: c[4] }
  }
  return out
}

export function writeHash(s, cam) {
  const p = new URLSearchParams()
  p.set('d', String(Math.round(s.t) % 5))
  if (s.dataState !== 'csv') { p.set('p', s.period); p.set('s', s.segment) }
  if (s.sel >= 0) p.set('b', String(s.sel))
  p.set('m', s.colorMode)
  if (s.colorMode === 'delta') p.set('base', String(s.deltaBase))
  p.set('v', s.layers.barrios)
  p.set('l', LAYER_KEYS.map((k) => (s.layers[k] ? '1' : '0')).join(''))
  if (cam) p.set('cam', [cam.center[0].toFixed(5), cam.center[1].toFixed(5), cam.zoom.toFixed(2), cam.pitch.toFixed(0), cam.bearing.toFixed(0)].join(','))
  const next = `#${p.toString()}`
  if (window.location.hash !== next) window.history.replaceState(null, '', next)
}
