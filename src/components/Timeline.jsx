import { useEffect, useRef } from 'react'
import { useStore } from '../store.js'
import { DAYS, hexToRgb } from '../lib/colors.js'
import { dayOf } from '../lib/week.js'
import { fmtK, pct } from '../lib/format.js'

// The week as five day columns: height = trips between barrios that day, dot = city bubble.
// Click or drag to pick a day.
export default function Timeline() {
  const wrap = useRef(null)
  const cv = useRef(null)
  const hover = useRef(-1)

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
      const bottom = H - 8
      const slot = (W - padX * 2) / 5
      const X = (d) => padX + d * slot
      const Y = (v) => bottom - (v / ds.maxMov) * (bottom - top - 4)
      const bubMax = Math.max(...ds.cityBub) || 1
      const narrow = W < 640
      ctx.clearRect(0, 0, W, H)
      const cur = dayOf(s.t)
      for (let d = 0; d < 5; d++) {
        const rgb = hexToRgb(DAYS[d].hue).join(',')
        const active = cur === d
        const x0 = X(d) + slot * 0.12
        const bw = slot * 0.76
        const g = ctx.createLinearGradient(0, top, 0, bottom)
        g.addColorStop(0, `rgba(${rgb},${active ? 0.85 : 0.5})`)
        g.addColorStop(1, `rgba(${rgb},${active ? 0.25 : 0.06})`)
        roundRect(ctx, x0, Y(ds.MOV[d]), bw, bottom - Y(ds.MOV[d]), 6)
        ctx.fillStyle = g
        ctx.fill()
        if (active || hover.current === d) {
          ctx.lineWidth = active ? 2 : 1
          ctx.strokeStyle = active ? DAYS[d].hue : colors.ink3
          ctx.stroke()
        }
        // bubble dot (share of trips that stay in their barrio) — only if the data has such trips
        if (ds.hasStays) {
        const by = top + 4 + (1 - ds.cityBub[d] / bubMax) * 14
        ctx.beginPath()
        ctx.arc(X(d) + slot - 14, by, 3.2, 0, Math.PI * 2)
        ctx.fillStyle = colors.ink3
        ctx.fill()
        }
        // labels
        const label = narrow ? DAYS[d].short : DAYS[d].name
        ctx.font = `italic ${active ? 17 : 15}px "Instrument Serif", Georgia, serif`
        ctx.fillStyle = active ? colors.ink : colors.ink3
        ctx.textBaseline = 'alphabetic'
        ctx.fillText(label, X(d) + 6, 18)
        if (!narrow) {
          const w = ctx.measureText(label).width
          ctx.font = '500 10px "Geist Mono Variable", monospace'
          ctx.fillStyle = colors.ink3
          ctx.fillText(ds.hasStays ? `${fmtK(ds.MOV[d])} · ${pct(ds.cityBub[d])}` : fmtK(ds.MOV[d]), X(d) + 6 + w + 8, 18)
        }
        if (d > 0) { ctx.fillStyle = colors.border; ctx.fillRect(X(d), 6, 1, H - 12) }
      }
      // playhead (moves smoothly while animating)
      const x = padX + (s.t + 0.5) * slot
      if (s.t <= 4.5) {
        ctx.fillStyle = colors.ink
        ctx.fillRect(x - 1, top - 8, 2, bottom - top + 8)
      }
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
    const toDay = (e) => {
      const r = wrap.current.getBoundingClientRect()
      return Math.max(0, Math.min(4, Math.floor(((e.clientX - r.left - 16) / (r.width - 32)) * 5)))
    }
    const el = wrap.current
    let dragging = false
    const down = (e) => {
      dragging = true
      el.setPointerCapture(e.pointerId)
      const s = useStore.getState()
      if (s.playing) s.togglePlay()
      s.goDay(toDay(e))
    }
    const move = (e) => {
      const d = toDay(e)
      if (dragging && d !== dayOf(useStore.getState().t)) useStore.getState().goDay(d)
      if (d !== hover.current) { hover.current = d; draw() }
    }
    const up = () => { dragging = false }
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

  const d = useStore((s) => dayOf(s.t))
  const onKey = (e) => {
    const s = useStore.getState()
    if (e.key === 'ArrowRight') { e.preventDefault(); s.stepDay(1) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); s.stepDay(-1) }
    else if (e.key === 'Home') { e.preventDefault(); s.goDay(0) }
    else if (e.key === 'End') { e.preventDefault(); s.goDay(4) }
  }
  return (
    <div
      ref={wrap}
      className="timeline"
      role="slider"
      tabIndex={0}
      aria-label="Día de la semana"
      aria-valuemin={0}
      aria-valuemax={4}
      aria-valuenow={d}
      aria-valuetext={DAYS[d].name}
      onKeyDown={onKey}
    >
      <canvas ref={cv} />
    </div>
  )
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, h / 2, w / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
