import { motion } from 'framer-motion'
import { Sparkles, Spline, Hexagon, CircleDot, Activity, Mountain, Building2, Tag, MapPin, Bike } from 'lucide-react'
import { useStore } from '../../store.js'
import { useShallow } from 'zustand/react/shallow'
import { Segmented, Switch, stagger } from '../ui/primitives.jsx'
import { MODES } from '../../lib/legend.js'
import { DAYS } from '../../lib/colors.js'
import { BARRIOS } from '../../model/geo.js'
import { fmt } from '../../lib/format.js'

function Row({ icon: Icon, title, desc, checked, onChange, i, tour }) {
  return (
    <motion.div className="row" data-tour={tour} style={{ cursor: 'pointer' }} onClick={() => onChange(!checked)} {...stagger(i)}>
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
    periods: st.periods, period: st.period, comparePeriod: st.comparePeriod, setComparePeriod: st.setComparePeriod, visitorKind: st.visitorKind, setVisitorKind: st.setVisitorKind,
    dataState: st.dataState, hasSeg: !!st.dataset.segArr, summary: !!st.summary, day: Math.round(st.t) % 5,
  })))
  const curLabel = s.periods.find((p) => p.id === s.period)?.label
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
            <motion.button key={k} className="mode-card" data-tour={`mode-${k}`} aria-pressed={s.colorMode === k} onClick={() => s.setColorMode(k)} {...stagger(i)}>
              {(k === 'period' || k === 'visitors') && <span className="new">Nuevo</span>}
              <b>{m.label}</b>
              <small>{m.desc}</small>
              <span className="ramp" style={{ background: `linear-gradient(90deg, ${m.ramp.join(',')})` }} />
            </motion.button>
          ))}
        </div>
        {s.colorMode === 'delta' && (
          <div className="sub-ctl" data-tour="sub-ctl">
            <span className="note">El {DAYS[s.day].name.toLowerCase()} (el día de la línea de metro) comparado con el…</span>
            <Segmented id="base" label="Día de referencia" value={s.deltaBase} onChange={s.setDeltaBase} options={DAYS.map((d, k) => ({ value: k, label: d.short }))} />
          </div>
        )}
        {s.colorMode === 'period' && (
          <div className="sub-ctl" data-tour="sub-ctl">
            {s.dataState === 'csv' ? (
              <span className="note">Solo funciona con los datos de Telefónica. Vuelve a ellos desde el panel Datos.</span>
            ) : (
              <>
                <label className="note" htmlFor="cmp-period"><b style={{ color: 'var(--ink)' }}>{curLabel}</b> comparado con…</label>
                <select id="cmp-period" className="select" value={s.comparePeriod} onChange={(e) => s.setComparePeriod(e.target.value)}>
                  {s.periods.filter((p) => p.id !== s.period).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
                <span className="note">{s.summary ? 'Ámbar: llega más gente que en el periodo de referencia. Azul: llega menos. Se compara la media de lunes a viernes.' : 'Cargando el resumen de periodos…'} Cambia el periodo actual en la barra inferior.</span>
              </>
            )}
          </div>
        )}
        {s.colorMode === 'visitors' && (
          <div className="sub-ctl" data-tour="sub-ctl">
            {s.hasSeg ? (
              <>
                <Segmented id="vis" label="Qué visitantes" value={s.visitorKind} onChange={s.setVisitorKind} options={[{ value: 'all', label: 'Todos los visitantes' }, { value: 'intl', label: 'Solo internacionales' }]} />
                <span className="note">Visitantes: quien no reside en Barcelona (viene del resto de Cataluña, de España o del extranjero). Con «Solo internacionales» salen los barrios más turísticos.</span>
              </>
            ) : <span className="note">Estos datos no distinguen tipos de viajero.</span>}
          </div>
        )}
        {s.colorMode === 'influence' && (
          <div className="sub-ctl" data-tour="sub-ctl">
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
          <Row i={0} icon={Spline} title="Viajes en movimiento" desc="Los 60 trayectos más fuertes del día, animados" checked={L.flows} onChange={(v) => set('flows', v)} />
          <Row i={1} icon={Sparkles} title="Conexiones del barrio" desc="Arcos hacia sus destinos al seleccionarlo" checked={L.arcs} onChange={(v) => set('arcs', v)} />
          <Row i={2} icon={Hexagon} tour="layer-hex" title="Colmena 3D" desc="Actividad en celdas de 300 m" checked={L.hex} onChange={(v) => set('hex', v)} />
          <Row i={3} icon={CircleDot} title="Burbujas flotantes" desc="Más alto, más cerrado en sí mismo" checked={L.bubbles} onChange={(v) => set('bubbles', v)} />
          <Row i={4} icon={Activity} title="Pulso" desc="Ondas en los tres barrios más activos" checked={L.pulse} onChange={(v) => set('pulse', v)} />
        </div>
      </section>

      <section>
        <div className="section-title"><h3>Mapa base</h3></div>
        <Segmented id="base-map" label="Mapa base" value={s.basemap} onChange={s.setBasemap} options={[{ value: 'satelite', label: 'Satélite' }, { value: 'mapa', label: 'Plano' }]} />
        <div className="list" style={{ marginTop: 8 }}>
          <Row i={0} icon={Mountain} title="Relieve 3D" desc="Collserola, Montjuïc y el Carmel en altura real" checked={L.terrain} onChange={(v) => set('terrain', v)} />
          <Row i={1} icon={Building2} title="Edificios 3D" desc="Aparecen al acercarte a un barrio" checked={L.buildings} onChange={(v) => set('buildings', v)} />
          <Row i={2} icon={MapPin} title="Calles y lugares" desc="Nombres de calles y municipios" checked={L.labels} onChange={(v) => set('labels', v)} />
          <Row i={3} icon={Tag} title="Nombres de barrio" desc="Etiquetas de los 73 barrios" checked={L.names} onChange={(v) => set('names', v)} />
        </div>
      </section>

      <section>
        <div className="section-title"><h3>En directo</h3><span>no es parte del dataset</span></div>
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
