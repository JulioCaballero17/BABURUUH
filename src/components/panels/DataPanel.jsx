import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileUp, Download, RotateCcw, Check, Info } from 'lucide-react'
import { useStore } from '../../store.js'
import { readFile, detectKind, buildFlows, buildAttributes, flowsToCsv, TEMPLATE_CSV, ATTR_TEMPLATE_CSV } from '../../model/importCsv.js'
import { deriveDataset } from '../../model/derive.js'
import { BARRIOS } from '../../model/geo.js'
import { DAYS } from '../../lib/colors.js'
import { fmt } from '../../lib/format.js'
import { dayOf } from '../../lib/week.js'
import { Segmented } from '../ui/primitives.jsx'
import { PeriodSelect } from '../Dock.jsx'
import { SEGMENTS } from '../../model/realData.js'

const download = (name, text, type = 'text/csv;charset=utf-8') => {
  const blob = new Blob(['﻿' + text], { type })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

export default function DataPanel() {
  const ds = useStore((s) => s.dataset)
  const attrs = useStore((s) => s.attrs)
  const report = useStore((s) => s.importReport)
  const loadDataset = useStore((s) => s.loadDataset)
  const resetDataset = useStore((s) => s.resetDataset)
  const toast = useStore((s) => s.toast)
  const dataState = useStore((s) => s.dataState)
  const segment = useStore((s) => s.segment)
  const setSegment = useStore((s) => s.setSegment)
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const input = useRef(null)

  const handle = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      const res = await readFile(file)
      const headers = res.meta.fields || []
      const kind = detectKind(headers)
      if (kind === 'flows') {
        const { F, report: rep } = buildFlows(res.data, headers)
        if (rep.error) { toast(rep.error, 'info'); useStore.setState({ importReport: { ...rep, file: file.name, kind } }); return }
        const next = deriveDataset(F, attrs, { kind: 'csv', label: `Datos reales · ${file.name}` })
        loadDataset(next, { ...rep, file: file.name, kind })
        toast(`Importadas ${fmt(rep.used)} filas. Todo el mapa se ha recalculado.`)
      } else if (kind === 'attributes') {
        const { attrs: na, report: rep } = buildAttributes(res.data, headers, attrs)
        const next = deriveDataset(ds.F, na, ds.source)
        loadDataset(next, { ...rep, file: file.name, kind }, na)
        toast(`Atributos actualizados para ${rep.used} barrios.`)
      } else {
        toast('No reconozco las columnas. Usa la plantilla como guía.', 'info')
        useStore.setState({ importReport: { error: `Columnas encontradas: ${headers.join(', ') || 'ninguna'}. Necesito «origen» y «destino» (flujos) o «barrio» con «poblacion» o «restaurantes» (atributos).`, file: file.name } })
      }
    } catch (e) {
      toast(`No se pudo leer el archivo: ${e.message}`, 'info')
    } finally {
      setBusy(false)
    }
  }

  const exportMetrics = () => {
    const d = dayOf(useStore.getState().t)
    const rows = ['codigo,barrio,distrito,poblacion_miles,restaurantes_1000hab,llegadas_lun,llegadas_mar,llegadas_mie,llegadas_jue,llegadas_vie,dia_pico,burbuja_lun,burbuja_mar,burbuja_mie,burbuja_jue,burbuja_vie,burbuja_media,efecto_viernes,perfil']
    ds.metrics.forEach((m) => {
      const b = BARRIOS[m.i]
      rows.push([b.code, `"${b.name}"`, `"${b.district}"`, ds.pop[m.i], ds.rest[m.i], ...m.arr.map((v) => Math.round(v)), DAYS[m.peak].name, ...m.bub.map((v) => v.toFixed(4)), m.bubAvg.toFixed(4), m.friE.toFixed(3), `"${m.tag.label}"`].join(','))
    })
    const s = useStore.getState()
    download(`metricas-barrios-${s.dataState === 'ok' ? `${s.period}-${s.segment}` : DAYS[d].name.toLowerCase()}.csv`, rows.join('\n'))
  }

  return (
    <>
      <section>
        <div className="report" style={{ gridTemplateColumns: 'auto 1fr', alignItems: 'center', columnGap: 10 }}>
          <span className="dot live" />
          <span><b>{ds.source.label}</b><br /><span style={{ color: 'var(--ink-3)' }}>{
            dataState === 'loading' ? 'Cargando…'
              : ds.source.kind === 'simulado' ? 'Modelo de gravedad (no se encontraron los datos reales).'
                : ds.source.kind === 'real' ? `Media de cada día laborable: ${ds.source.nDays.map((n, k) => `${n} ${DAYS[k].short.toLowerCase()}`).join(', ')}.`
                  : `${fmt(ds.DAYTOT.reduce((a, b) => a + b, 0))} viajes entre barrios en la semana.`
          }</span></span>
        </div>
      </section>

      {dataState !== 'csv' && dataState !== 'error' && (
        <section>
          <div className="section-title"><h3>Periodo</h3><span>media de lunes a viernes</span></div>
          <div className="clock" style={{ minWidth: 0 }}><PeriodSelect id="period-panel" /></div>
          <div className="section-title" style={{ marginTop: 16 }}><h3>Tipo de viajero</h3></div>
          <Segmented id="segment" label="Tipo de viajero" value={segment} onChange={setSegment} options={SEGMENTS.map((s) => ({ value: s.value, label: s.label }))} />
          <p className="note" style={{ marginTop: 8 }}>{SEGMENTS.find((s) => s.value === segment)?.long}. Para estudiar la burbuja de los vecinos, usa «Residentes».</p>
        </section>
      )}

      <section>
        <div
          className={`dropzone ${over ? 'over' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => input.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files?.[0]) }}
        >
          <FileUp />
          <b>{busy ? 'Leyendo el archivo…' : 'Arrastra aquí tu CSV'}</b>
          <small>Flujos (origen, destino, día, viajes) — también los ficheros mensuales originales — o atributos (barrio, población, restaurantes)</small>
          <input ref={input} type="file" accept=".csv,.txt,.tsv" hidden onChange={(e) => { handle(e.target.files?.[0]); e.target.value = '' }} />
        </div>
      </section>

      <AnimatePresence>
        {report && (
          <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="section-title"><h3>Resultado de la importación</h3><span>{report.file}</span></div>
            <div className="report">
              {report.error ? (
                <span className="bad">{report.error}</span>
              ) : (
                <>
                  <span className="ok" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Check width={15} height={15} /> {fmt(report.used)} de {fmt(report.rows)} filas usadas</span>
                  {report.kind === 'flows' && (
                    <>
                      <span>Días con datos: {[...report.days].sort().map((d) => DAYS[d].short).join(', ') || '—'}</span>
                      {report.weeksAveraged > 1 && <span>Se han promediado hasta {report.weeksAveraged} fechas por día laborable.</span>}
                      {report.weekend > 0 && <span>{fmt(report.weekend)} filas de fin de semana no se usan.</span>}
                      {report.invalid > 0 && <span className="bad">{fmt(report.invalid)} filas con día, hora o cantidad no válidos.</span>}
                    </>
                  )}
                  {report.unmatched?.size > 0 && (
                    <span className="bad">
                      Barrios sin reconocer: {[...report.unmatched.entries()].slice(0, 6).map(([n, c]) => `${n} (${c})`).join(', ')}{report.unmatched.size > 6 ? '…' : ''}. Usa el nombre oficial o el código (1–73 u 080190101).
                    </span>
                  )}
                </>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <section>
        <div className="section-title"><h3>Plantillas</h3></div>
        <div style={{ display: 'grid', gap: 8 }}>
          <button className="btn" onClick={() => download('plantilla-flujos.csv', TEMPLATE_CSV)}><Download /> Plantilla de flujos</button>
          <button className="btn" onClick={() => download('plantilla-atributos.csv', ATTR_TEMPLATE_CSV)}><Download /> Plantilla de atributos</button>
          {(dataState === 'csv' || report) && <button className="btn ghost" onClick={() => { resetDataset(); toast('De vuelta a los datos reales.') }}><RotateCcw /> Volver a los datos reales</button>}
        </div>
      </section>

      <section>
        <div className="section-title"><h3>Exportar</h3></div>
        <div style={{ display: 'grid', gap: 8 }}>
          <button className="btn" onClick={exportMetrics}><Download /> Métricas de los 73 barrios</button>
          <button className="btn" onClick={() => { download('flujos-semana.csv', flowsToCsv(ds, 10)); toast('Flujos exportados (filas con 10 viajes o más).') }}><Download /> Flujos de lunes a viernes</button>
        </div>
      </section>

      <section>
        <p className="note" style={{ display: 'flex', gap: 8 }}>
          <Info width={15} height={15} style={{ flex: 'none', marginTop: 1 }} />
          <span>
            Los datos reales vienen ya procesados (script <code>scripts/preprocess-mobility.mjs</code>). Para importar un CSV propio: el día puede ser un nombre (lunes, dl, monday),
            un número (1 = lunes) o una fecha; si cubre varias semanas, se promedian. No se usan horas. Los barrios se reconocen por nombre (con o sin artículo) o por código oficial.
          </span>
        </p>
      </section>
    </>
  )
}
