import { useEffect } from 'react'
import { MotionConfig } from 'framer-motion'
import { useStore, selectDark } from './store.js'
import { readHash } from './lib/url.js'
import { useShortcuts, useHashSync } from './hooks.js'
import MapCanvas from './components/MapCanvas.jsx'
import Intro from './components/Intro.jsx'
import TopBar from './components/TopBar.jsx'
import ToolPanel from './components/ToolPanel.jsx'
import BarrioDrawer from './components/BarrioDrawer.jsx'
import MapControls from './components/MapControls.jsx'
import Dock from './components/Dock.jsx'
import Tooltip from './components/Tooltip.jsx'
import Tour from './components/Tour.jsx'
import CommandPalette from './components/CommandPalette.jsx'
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
    ...(HASH.view ? { view: HASH.view } : {}),
    ...(HASH.business ? { business: HASH.business } : {}),
    ...(HASH.scenario ? { scenario: HASH.scenario } : {}),
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

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#17191C' : '#F7F8F6')
  }, [dark])
  useShortcuts()
  useHashSync()

  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        <MapCanvas startCam={HASH?.cam} />
        <Intro />
        {intro === 'done' && (
          <>
            <TopBar />
            <ToolPanel />
            <BarrioDrawer />
            <MapControls />
            <Dock />
            <Tooltip />
            <Tour />
            <CommandPalette />
            <HelpOverlay />
          </>
        )}
        <Toasts />
      </div>
    </MotionConfig>
  )
}
