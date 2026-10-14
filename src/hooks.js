import { useEffect } from 'react'
import { useStore } from './store.js'
import { fetchWeather, fetchBicing } from './lib/apis.js'
import { writeHash } from './lib/url.js'
import { getCamera, flyHome, getMap } from './engine/mapEngine.js'
import { PANELS } from './components/Rail.jsx'

const typing = (e) => e.target.closest?.('input, textarea, select, [contenteditable="true"]')

export function useShortcuts() {
  useEffect(() => {
    const onKey = (e) => {
      const s = useStore.getState()
      if (s.intro !== 'done') return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); s.setCmdk(!s.cmdk); return }
      if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Escape') {
        if (s.compareOpen) s.closeCompare()
        else if (s.help) s.setHelp(false)
        else if (s.cmdk) s.setCmdk(false)
        else if (s.sel >= 0) s.select(-1)
        else if (s.panel) s.setPanel(s.panel)
        return
      }
      if (s.cmdk || s.compareOpen || s.help) return
      const onButton = e.target.closest?.('button, [role="slider"]')
      if (e.key === ' ' && !onButton) { e.preventDefault(); s.togglePlay(); return }
      if (/^[1-5]$/.test(e.key) && !s.story.active) { s.goDay(Number(e.key) - 1); return }
      if (e.key === 'ArrowRight' && !onButton && !s.story.active) { e.preventDefault(); s.stepHour(1); return }
      if (e.key === 'ArrowLeft' && !onButton && !s.story.active) { e.preventDefault(); s.stepHour(-1); return }
      if (e.key === '/') { e.preventDefault(); s.setCmdk(true); return }
      if (e.key === '?') { s.setHelp(true); return }
      const k = e.key.toLowerCase()
      const p = PANELS.find((x) => x.kb.toLowerCase() === k)
      if (p) { s.setPanel(p.key); return }
      if (k === 'o') s.setOrbit(!s.orbit)
      else if (k === 'h') flyHome()
      else if (k === 'p') document.querySelector('[aria-label="Descargar captura del mapa"]')?.click()
      else if (k === 'd') { if (s.colorMode === 'delta') s.setColorMode('activity'); else { s.setDeltaBase(0); s.setColorMode('delta') } }
      else if (k === 'c' && s.sel >= 0) s.openCompare()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

export function useWeather() {
  useEffect(() => {
    let alive = true
    useStore.setState({ weatherState: 'loading' })
    fetchWeather()
      .then((w) => alive && useStore.setState({ weather: w, weatherState: 'ok' }))
      .catch(() => alive && useStore.setState({ weatherState: 'error' }))
    return () => { alive = false }
  }, [])
}

export function useBicing() {
  const on = useStore((s) => s.layers.bicing)
  useEffect(() => {
    if (!on) return
    let alive = true
    const load = () => {
      if (!useStore.getState().bicing) useStore.setState({ bicingState: 'loading' })
      fetchBicing()
        .then((b) => alive && useStore.setState({ bicing: b, bicingState: 'ok' }))
        .catch(() => {
          if (!alive) return
          useStore.setState({ bicingState: 'error' })
          useStore.getState().toast('No se pudo cargar Bicing en directo. Comprueba la conexión.', 'info')
        })
    }
    load()
    const id = setInterval(load, 60000)
    return () => { alive = false; clearInterval(id) }
  }, [on])
}

export function useHashSync() {
  useEffect(() => {
    let timer = 0
    const push = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const s = useStore.getState()
        if (s.intro !== 'done') return
        writeHash(s, getCamera())
      }, 700)
    }
    const unsub = useStore.subscribe((s, p) => {
      if (s.intro !== 'done') return
      if (Math.floor(s.t * 4) !== Math.floor(p.t * 4) || s.sel !== p.sel || s.colorMode !== p.colorMode || s.layers !== p.layers || s.deltaBase !== p.deltaBase || s.intro !== p.intro) push()
    })
    const attach = () => { const m = getMap(); if (m) m.on('moveend', push); else setTimeout(attach, 300) }
    attach()
    return () => { unsub(); clearTimeout(timer); getMap()?.off('moveend', push) }
  }, [])
}

// Keeps the accent colour of the interface on the current weekday.
export function useDayAccent(dayHue) {
  useEffect(() => {
    const el = document.documentElement
    el.style.setProperty('--day', dayHue)
    const n = dayHue.replace('#', '')
    el.style.setProperty('--day-rgb', `${parseInt(n.slice(0, 2), 16)}, ${parseInt(n.slice(2, 4), 16)}, ${parseInt(n.slice(4, 6), 16)}`)
  }, [dayHue])
}
