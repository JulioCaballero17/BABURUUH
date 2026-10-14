import { useEffect } from 'react'
import { MotionConfig } from 'framer-motion'
import { useStore, selectDark } from './store.js'
import { readHash } from './lib/url.js'
import { DAYS } from './lib/colors.js'
import { dayOf } from './lib/week.js'
import { useShortcuts, useWeather, useBicing, useHashSync, useDayAccent } from './hooks.js'
import MapCanvas from './components/MapCanvas.jsx'
import Intro from './components/Intro.jsx'
import TopBar from './components/TopBar.jsx'
import Rail from './components/Rail.jsx'
import SidePanel from './components/SidePanel.jsx'
import BarrioDrawer from './components/BarrioDrawer.jsx'
import MapControls from './components/MapControls.jsx'
import Dock from './components/Dock.jsx'
import Tooltip from './components/Tooltip.jsx'
import StoryOverlay from './components/StoryOverlay.jsx'
import CommandPalette from './components/CommandPalette.jsx'
import CompareModal from './components/CompareModal.jsx'
import { HelpOverlay, Toasts } from './components/Overlays.jsx'

// Restore a shared view from the URL before the first render.
const HASH = readHash()
if (HASH) {
  const s = useStore.getState()
  useStore.setState({
    ...(HASH.t != null ? { t: HASH.t } : {}),
    ...(HASH.sel != null ? { sel: HASH.sel } : {}),
    ...(HASH.colorMode ? { colorMode: HASH.colorMode } : {}),
    ...(HASH.deltaBase != null ? { deltaBase: HASH.deltaBase } : {}),
    layers: { ...s.layers, ...(HASH.layers || {}), ...(HASH.barrios ? { barrios: HASH.barrios } : {}) },
  })
}
if (window.innerWidth < 760) useStore.setState({ panel: null })

export default function App() {
  const dark = useStore(selectDark)
  const day = useStore((s) => dayOf(s.t))
  const intro = useStore((s) => s.intro)

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a1018' : '#f4f3ef')
  }, [dark])
  useDayAccent(dark ? DAYS[day].hue : DAYS[day].hueLight)
  useShortcuts()
  useWeather()
  useBicing()
  useHashSync()

  return (
    <MotionConfig reducedMotion="user">
    <div className="app">
      <MapCanvas startCam={HASH?.cam} />
      <Intro />
      {intro === 'done' && (
        <>
          <TopBar />
          <Rail />
          <SidePanel />
          <BarrioDrawer />
          <MapControls />
          <Dock />
          <Tooltip />
          <StoryOverlay />
          <CommandPalette />
          <CompareModal />
          <HelpOverlay />
        </>
      )}
      <Toasts />
    </div>
    </MotionConfig>
  )
}
