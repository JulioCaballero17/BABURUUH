import { useEffect } from 'react'
import { MotionConfig } from 'framer-motion'
import { useStore, selectDark } from './store.js'
import { readHash } from './lib/url.js'
import { useShortcuts, useBicing, useHashSync } from './hooks.js'
import MapCanvas from './components/MapCanvas.jsx'
import Intro from './components/Intro.jsx'
import TopBar from './components/TopBar.jsx'
import Rail from './components/Rail.jsx'
import SidePanel from './components/SidePanel.jsx'
import BarrioDrawer from './components/BarrioDrawer.jsx'
import MapControls from './components/MapControls.jsx'
import Dock from './components/Dock.jsx'
import Tooltip from './components/Tooltip.jsx'
import Tour from './components/Tour.jsx'
import Cinema from './components/Cinema.jsx'
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
    ...(HASH.period ? { period: HASH.period } : {}),
    ...(HASH.segment ? { segment: HASH.segment } : {}),
    ...(HASH.comparePeriod ? { comparePeriod: HASH.comparePeriod } : {}),
    ...(HASH.visitorKind ? { visitorKind: HASH.visitorKind } : {}),
    layers: { ...s.layers, ...(HASH.layers || {}), ...(HASH.barrios ? { barrios: HASH.barrios } : {}) },
  })
}
// Load the real data (preprocessed per period) as soon as the app starts, then the light summary
// used by the monthly evolution and the period comparison.
useStore.getState().loadReal().then(() => useStore.getState().loadSummary())

export default function App() {
  const dark = useStore(selectDark)
  const intro = useStore((s) => s.intro)
  const cinema = useStore((s) => s.cinema.active)

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#17191C' : '#F7F8F6')
  }, [dark])
  useShortcuts()
  useBicing()
  useHashSync()

  return (
    <MotionConfig reducedMotion="user">
      <div className={`app ${cinema ? 'cinema' : ''}`}>
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
            <Tour />
            <Cinema />
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
