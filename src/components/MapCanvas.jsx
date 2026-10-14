import { useEffect, useRef } from 'react'
import { initMap, destroyMap } from '../engine/mapEngine.js'

export default function MapCanvas({ startCam }) {
  const ref = useRef(null)
  useEffect(() => {
    initMap(ref.current, startCam)
    return () => destroyMap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <div ref={ref} className="map" role="application" aria-label="Mapa 3D de Barcelona con la movilidad entre barrios" />
}
