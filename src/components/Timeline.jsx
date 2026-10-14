import { useEffect, useRef } from 'react'
import { useStore } from '../store.js'
import { DAYS, hexToRgb } from '../lib/colors.js'
import { NIGHT_PROFILE, clockText, dayDate } from '../lib/week.js'
import { fmtK } from '../lib/format.js'

// The week as one continuous waveform: five day segments, night shading from the real sun,
// a playhead you can drag, and a hover readout.
export default function Timeline() {
  const wrap = useRef(null)
  const cv = useRef(null)
  const hover = useRef(-1)
  const dragging = useRef(false)

  useEffect(() => {
    const canvas = cv.current
    const ctx = canvas.getContext('2d')
    let W = 0
    let H = 0
    let colors = {}
    const readColors = () => {
      const cs = getComputedStyle(document.documentElement)
      colors = { ink: cs.getPropertyValue('--ink').trim(), ink3: cs.getPropertyValue('--ink-3').trim(), border: cs.getPropertyValue('--glass-border').trim(), dark: document.documentElement.dataset.theme === 'dark' }
    }
    const resize = () => {
      const r = wrap.current.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      W = r.width
      H = r.height
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw()
    }
    const draw = () => {
      if (!W) return
      readColors()
      const s = useStore.getState()
      const ds = s.dataset
      const padX = 16
      const top = 30
      const bottom = H - 22
      const X = (t) => padX + (t / 120) * (W - padX * 2)
      const Y = (v) => bottom - (v / ds.maxMov) * (bottom - top - 6)
      ctx.clearRect(0, 0, W, H)

      // night shading from the real sun (one smooth gradient across the week)
      const ng = ctx.createLinearGradient(X(0), 0, X(120), 0)
      for (let k = 0; k < NIGHT_PROFILE.length; k += 2) {
        const n = NIGHT_PROFILE[k]
        ng.addColorStop(k / (NIGHT_PROFILE.length - 1), colors.dark ? `rgba(0,0,0,${(0.34 * n).toFixed(3)})` : `rgba(18,24,33,${(0.075 * n).toFixed(3)})`)
      }
      ctx.fillStyle = ng
      ctx.fillRect(X(0), top - 10, X(120) - X(0), bottom - top + 10)
      // day segments
      for (let d = 0; d < 5; d++) {
        const rgb = hexToRgb(DAYS[d].hue).join(',')
        const g = ctx.createLinearGradient(0, top, 0, bottom)
        g.addColorStop(0, `rgba(${rgb},0.5)`)
        g.addColorStop(1, `rgba(${rgb},0.04)`)
        ctx.beginPath()
        ctx.moveTo(X(d * 24), bottom)
        for (let h = 0; h <= 24; h++) { const t = Math.min(119, d * 24 + h); ctx.lineTo(X(d * 24 + h), Y(ds.MOV[t])) }
        ctx.lineTo(X(d * 24 + 24), bottom)
        ctx.closePath()
        ctx.fillStyle = g
        ctx.fill()
        ctx.beginPath()
        for (let h = 0; h <= 24; h++) { const t = Math.min(119, d * 24 + h); const x = X(d * 24 + h); const y = Y(ds.MOV[t]); h ? ctx.lineTo(x, y) : ctx.moveTo(x, y) }
        ctx.strokeStyle = DAYS[d].hue
        ctx.lineWidth = 1.6
        ctx.stroke()
        // day label
        const active = Math.floor(s.t / 24) === d
        const narrow = W < 640
        const label = narrow ? DAYS[d].short : DAYS[d].name
        ctx.font = `italic ${active ? 17 : 15}px "Instrument Serif", Georgia, serif`
        ctx.fillStyle = active ? colors.ink : colors.ink3
        ctx.textBaseline = 'alphabetic'
        ctx.fillText(label, X(d * 24) + 6, 18)
        const w = ctx.measureText(label).width
        if (!narrow) {
          ctx.font = '500 10px "Geist Mono Variable", monospace'
          ctx.fillStyle = colors.ink3
          ctx.fillText(dayDate(d), X(d * 24) + 6 + w + 8, 18)
        }
        if (d > 0) { ctx.fillStyle = colors.border; ctx.fillRect(X(d * 24), 6, 1, H - 12) }
        ctx.fillStyle = colors.ink3
        ctx.font = '400 9.5px "Geist Mono Variable", monospace'
        for (const h of narrow ? [12] : [6, 12, 18]) ctx.fillText(String(h), X(d * 24 + h) - 5, H - 7)
      }
      // hover
      if (hover.current >= 0 && !dragging.current) {
        const t = hover.current
        ctx.fillStyle = colors.ink3
        ctx.fillRect(X(t) - 0.5, top - 6, 1, bottom - top + 6)
        const lbl = `${DAYS[Math.floor(t / 24)].short} ${clockText(t)} · ${fmtK(ds.MOV[Math.floor(t)])}/h`
        ctx.font = '500 11px "Geist Mono Variable", monospace'
        const lw = ctx.measureText(lbl).width + 14
        const lx = Math.min(Math.max(X(t) - lw / 2, 2), W - lw - 2)
        ctx.fillStyle = colors.dark ? 'rgba(20,26,36,0.95)' : 'rgba(255,255,255,0.95)'
        roundRect(ctx, lx, bottom - 24, lw, 20, 6)
        ctx.fill()
        ctx.fillStyle = colors.ink
        ctx.fillText(lbl, lx + 7, bottom - 10)
      }
      // playhead
      const t = s.t
      const x = X(t)
      const v = ds.MOV[Math.floor(t)] * (1 - (t % 1)) + ds.MOV[Math.min(119, Math.floor(t) + 1)] * (t % 1)
      ctx.fillStyle = colors.ink
      ctx.fillRect(x - 1, top - 8, 2, bottom - top + 8)
      ctx.beginPath()
      ctx.arc(x, Y(v), 6, 0, Math.PI * 2)
      ctx.fillStyle = colors.dark ? '#0E141D' : '#FFFFFF'
      ctx.fill()
      ctx.lineWidth = 2.5
      ctx.strokeStyle = DAYS[Math.floor(t / 24)].hue
      ctx.stroke()
    }
    readColors()
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap.current)
    let lastT = -1
    let lastV = null
    const unsub = useStore.subscribe((s) => {
      if (s.t !== lastT || s.dataset !== lastV) { lastT = s.t; lastV = s.dataset; draw() }
    })
    const mo = new MutationObserver(() => { readColors(); draw() })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const toT = (e) => {
      const r = wrap.current.getBoundingClientRect()
      return Math.max(0, Math.min(119.99, ((e.clientX - r.left - 16) / (r.width - 32)) * 120))
    }
    const el = wrap.current
    const down = (e) => {
      dragging.current = true
      el.setPointerCapture(e.pointerId)
      const s = useStore.getState()
      if (s.playing) s.togglePlay()
      s.setT(toT(e))
    }
    const move = (e) => {
      hover.current = toT(e)
      if (dragging.current) useStore.getState().setT(toT(e))
      else draw()
    }
    const up = () => { dragging.current = false; draw() }
    const leave = () => { hover.current = -1; draw() }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointerleave', leave)
    return () => {
      ro.disconnect()
      mo.disconnect()
      unsub()
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointerleave', leave)
    }
  }, [])

  const t = useStore((s) => Math.round(s.t * 4) / 4)
  const onKey = (e) => {
    const s = useStore.getState()
    if (e.key === 'ArrowRight') { e.preventDefault(); s.stepHour(1) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); s.stepHour(-1) }
    else if (e.key === 'Home') { e.preventDefault(); s.goTo(0) }
    else if (e.key === 'End') { e.preventDefault(); s.goTo(119.75) }
  }
  return (
    <div
      ref={wrap}
      className="timeline"
      role="slider"
      tabIndex={0}
      aria-label="Momento de la semana"
      aria-valuemin={0}
      aria-valuemax={120}
      aria-valuenow={t}
      aria-valuetext={`${DAYS[Math.floor(t / 24) % 5].name} ${clockText(t)}`}
      onKeyDown={onKey}
    >
      <canvas ref={cv} />
    </div>
  )
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
