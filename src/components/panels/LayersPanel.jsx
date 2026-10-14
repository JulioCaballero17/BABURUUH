import { motion } from 'framer-motion'
import { Sparkles, Spline, Hexagon, CircleDot, Activity, Mountain, Building2, Tag, MapPin, Bike } from 'lucide-react'
import { useStore } from '../../store.js'
import { useShallow } from 'zustand/react/shallow'
import { Segmented, Switch, stagger } from '../ui/primitives.jsx'
import { MODES } from '../../lib/legend.js'
import { DAYS } from '../../lib/colors.js'
import { BARRIOS } from '../../model/geo.js'
import { fmt } from '../../lib/format.js'

function Row({ icon: Icon, title, desc, checked, onChange, i }) {
  return (
    <motion.div className="row" style={{ cursor: 'pointer' }} onClick={() => onChange(!checked)} {...stagger(i)}>
      <span className="ico"><Icon /></span>
      <span className="txt"><b>{title}</b><small>{desc}</small></span>
      <span onClick={(e) => e.stopPropagation()}><Switch checked={checked} onChange={onChange} label={title} /></span>
    </motion.div>
  )
}

export default function LayersPanel() {
  const s = useStore(useShallow((st) => ({
    layers: st.layers, setLayer: st.setLayer, bicing: st.bicing, bicingState: st.bicingState, colorMode: st.colorMode, setColorMode: st.setColorMode,
    deltaBase: st.deltaBase, setDeltaBase: st.setDeltaBase, influenceDir: st.influenceDir, setInfluenceDir: st.setInfluenceDir, sel: st.sel, basemap: st.basemap, setBasemap: st.setBasemap,
  })))
  const L = s.layers
  const set = s.setLayer
  const bicing = s.bicing
  const ago = bicing ? Math.max(0, Math.round((Date.now() - bicing.fetchedAt) / 60000)) : 0

  return (
    <>
      <section>
        <div className="section-title"><h3>Colorear barrios por</h3></div>
        <div className="mode-grid">
          {Object.entries(MODES).map(([k, m], i) => (
            <motion.button key={k} className="mode-card" aria-pressed={s.colorMode === k} onClick={() => s.setColorMode(k)} {...stagger(i)}>
              <b>{m.label}</b>
              <small>{m.desc}</small>
              <span className="ramp" style={{ background: `linear-gradient(90deg, ${m.ramp.join(',')})` }} />
            </motion.button>
          ))}
        </div>
        {s.colorMode === 'delta' && (
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            <span className="note">Comparar con la misma hora del…</span>
            <Segmented id="base" label="Día de referencia" value={s.deltaBase} onChange={s.setDeltaBase} options={DAYS.map((d, k) => ({ value: k, label: d.short }))} />
          </div>
        )}
        {s.colorMode === 'influence' && (
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            <Segmented id="dir" label="Dirección" value={s.influenceDir} onChange={s.setInfluenceDir} options={[{ value: 'out', label: 'Adónde va su gente' }, { value: 'in', label: 'De dónde viene' }]} />
            <span className="note">{s.sel >= 0 ? `Barrio de referencia: ${BARRIOS[s.sel].name}.` : 'Haz clic en un barrio del mapa para elegirlo.'}</span>
          </div>
        )}
      </section>

      <section>
        <div className="section-title"><h3>Barrios</h3></div>
        <Segmented id="bview" label="Vista de barrios" value={L.barrios} onChange={(v) => set('barrios', v)} options={[{ value: '3d', label: 'Columnas 3D' }, { value: '2d', label: 'Plano' }, { value: 'off', label: 'Ocultar' }]} />
      </section>

      <section>
        <div className="section-title"><h3>Capas de datos</h3></div>
        <div className="list">
          <Row i={0} icon={Spline} title="Viajes en movimiento" desc="Los flujos más fuertes de cada hora, animados" checked={L.flows} onChange={(v) => set('flows', v)} />
          <Row i={1} icon={Sparkles} title="Conexiones del barrio" desc="Arcos hacia sus destinos al seleccionarlo" checked={L.arcs} onChange={(v) => set('arcs', v)} />
          <Row i={2} icon={Hexagon} title="Colmena 3D" desc="Actividad en celdas de 300 m" checked={L.hex} onChange={(v) => set('hex', v)} />
          <Row i={3} icon={CircleDot} title="Burbujas flotantes" desc="Más alto, más cerrado en sí mismo" checked={L.bubbles} onChange={(v) => set('bubbles', v)} />
          <Row i={4} icon={Activity} title="Pulso" desc="Ondas en los tres barrios más activos" checked={L.pulse} onChange={(v) => set('pulse', v)} />
        </div>
      </section>

      <section>
        <div className="section-title"><h3>Mapa base</h3></div>
        <Segmented id="base-map" label="Mapa base" value={s.basemap} onChange={s.setBasemap} options={[{ value: 'satelite', label: 'Satélite' }, { value: 'mapa', label: 'Cartografía' }]} />
        <div className="list" style={{ marginTop: 8 }}>
          <Row i={0} icon={Mountain} title="Relieve 3D" desc="Collserola, Montjuïc y el Carmel en altura real" checked={L.terrain} onChange={(v) => set('terrain', v)} />
          <Row i={1} icon={Building2} title="Edificios 3D" desc="Aparecen al acercarte a un barrio" checked={L.buildings} onChange={(v) => set('buildings', v)} />
          <Row i={2} icon={MapPin} title="Calles y lugares" desc="Rotulación sobre el satélite" checked={L.labels} onChange={(v) => set('labels', v)} />
          <Row i={3} icon={Tag} title="Nombres de barrio" desc="Etiquetas de los 73 barrios" checked={L.names} onChange={(v) => set('names', v)} />
        </div>
      </section>

      <section>
        <div className="section-title"><h3>En directo</h3><span>datos reales</span></div>
        <div className="list">
          <Row i={0} icon={Bike} title="Bicing ahora" desc={
            s.bicingState === 'loading' ? 'Cargando estaciones…'
              : s.bicingState === 'error' ? 'No se pudo conectar con el servicio. Vuelve a intentarlo en un momento.'
                : bicing ? `${fmt(bicing.total)} bicis libres en ${bicing.stations.length} estaciones · hace ${ago} min`
                  : 'Estaciones y bicis disponibles, cada minuto'
          } checked={L.bicing} onChange={(v) => set('bicing', v)} />
        </div>
      </section>
    </>
  )
}
