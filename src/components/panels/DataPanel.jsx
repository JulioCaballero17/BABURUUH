import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileUp, Download, RotateCcw, Check, Info } from 'lucide-react'
import { useStore, SIMULATED } from '../../store.js'
import { readFile, detectKind, buildFlows, buildAttributes, flowsToCsv, TEMPLATE_CSV, ATTR_TEMPLATE_CSV } from '../../model/importCsv.js'
import { deriveDataset } from '../../model/derive.js'
import { BARRIOS } from '../../model/geo.js'
import { DAYS } from '../../lib/colors.js'
import { fmt } from '../../lib/format.js'
import { dayOf } from '../../lib/week.js'

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
    const rows = ['codigo,barrio,distrito,poblacion_miles,restaurantes_1000hab,llegadas_semana,pico_semana,burbuja_lun,burbuja_mar,burbuja_mie,burbuja_jue,burbuja_vie,efecto_viernes,perfil']
    ds.metrics.forEach((m) => {
      const b = BARRIOS[m.i]
      rows.push([b.code, `"${b.name}"`, `"${b.district}"`, ds.pop[m.i], ds.rest[m.i], Math.round(m.weekArr), `${DAYS[Math.floor(m.peak / 24)].name} ${m.peak % 24}h`, ...m.bub.map((v) => v.toFixed(4)), m.friE.toFixed(3), `"${m.tag.label}"`].join(','))
    })
    download(`metricas-barrios-${DAYS[d].name.toLowerCase()}.csv`, rows.join('\n'))
  }

  return (
    <>
      <section>
        <div className="report" style={{ gridTemplateColumns: 'auto 1fr', alignItems: 'center', columnGap: 10 }}>
          <span className="dot live" />
          <span><b>{ds.source.label}</b><br /><span style={{ color: 'var(--ink-3)' }}>{ds.source.kind === 'simulado' ? 'Modelo de gravedad con efectos de cada día laborable.' : `${fmt(ds.DAYTOT.reduce((a, b) => a + b, 0))} desplazamientos entre barrios en la semana.`}</span></span>
        </div>
      </section>

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
          <small>Flujos (origen, destino, día, hora, personas) o atributos (barrio, población, restaurantes)</small>
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
                      <span>Días con datos: {[...report.days].sort().map((d) => DAYS[d].short).join(', ') || '—'} · horas: {report.hours.size}</span>
                      {report.weeksAveraged > 1 && <span>Se han promediado {report.weeksAveraged} semanas por día laborable.</span>}
                      {report.weekend > 0 && <span>{fmt(report.weekend)} filas de fin de semana no se usan.</span>}
                      {report.invalid > 0 && <span className="bad">{fmt(report.invalid)} filas con día, hora o cantidad no válidos.</span>}
                    </>
                  )}
                  {report.unmatched?.size > 0 && (
                    <span className="bad">
                      Barrios sin reconocer: {[...report.unmatched.entries()].slice(0, 6).map(([n, c]) => `${n} (${c})`).join(', ')}{report.unmatched.size > 6 ? '…' : ''}. Usa el nombre oficial o el código 1–73.
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
          {ds !== SIMULATED && <button className="btn ghost" onClick={() => { resetDataset(); toast('De vuelta a los datos simulados.') }}><RotateCcw /> Volver a los datos simulados</button>}
        </div>
      </section>

      <section>
        <div className="section-title"><h3>Exportar</h3></div>
        <div style={{ display: 'grid', gap: 8 }}>
          <button className="btn" onClick={exportMetrics}><Download /> Métricas de los 73 barrios</button>
          <button className="btn" onClick={() => { download('flujos-semana.csv', flowsToCsv(ds, 10)); toast('Flujos exportados (filas con 10 personas o más).') }}><Download /> Flujos de toda la semana</button>
        </div>
      </section>

      <section>
        <p className="note" style={{ display: 'flex', gap: 8 }}>
          <Info width={15} height={15} style={{ flex: 'none', marginTop: 1 }} />
          <span>
            El día puede ser un nombre (lunes, dl, monday), un número (1 = lunes) o una fecha; si el archivo cubre varias semanas, se promedian.
            La hora acepta 8, «08:00» o «08:00-09:00». Los barrios se reconocen por nombre (con o sin artículo) o por código oficial.
          </span>
        </p>
      </section>
    </>
  )
}
