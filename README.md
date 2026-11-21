# Baburu

Cómo se mueve la gente entre los 73 barrios de Barcelona, de lunes a viernes, con los **datos de movilidad de
Telefónica** (enero 2023 – agosto 2025). Mapa 3D (satélite o plano) con capas de datos animadas, fichas de barrio,
paneles de análisis y un **Tour** que recorre todas las funciones para presentar el proyecto.

**Diseño «Plano de Barcelona»**: paneles sólidos en blanco o asfalto, un único acento amarillo taxi, tipografía
Archivo (títulos, estilo señalética) + Geist (texto). La semana se muestra como una **línea de metro**.

## Cómo arrancarlo

Necesitas **Node.js 18 o superior** (recomendado el 20 LTS o el 22).

```bash
npm install
npm run dev
```

Se abre solo en `http://localhost:5173`. Recomendado Chrome o Edge en un ordenador con tarjeta gráfica;
si el equipo va justo, la app activa sola un «modo ligero».

Para generar la versión de producción: `npm run build` y `npm run preview`.

## Datos reales

Los ficheros crudos (`movilidad_barrios_YYYY-MM_origen.csv`, ~2 GB) **no** se cargan en el navegador.
Se preprocesan una vez con:

```bash
node scripts/preprocess-mobility.mjs ../output_limite_legal
```

El script genera `public/data/movilidad/` (≈14 MB): un JSON por periodo (cada mes, cada año y «todos»)
con la **media de cada día laborable** (lunes … viernes) de los viajes entre barrios, separada por tipo de viajero
(Residente, Regional, Nacional, Internacional). Los fines de semana se descartan. Hay que volver a ejecutarlo
cuando lleguen meses nuevos. La app carga el periodo elegido bajo demanda.

Al final, el mismo script escribe `summary.json` (≈145 KB): la media de llegadas y salidas por barrio, periodo y tipo
de viajero. Lo usan la **evolución mes a mes** de la ficha y el modo **Cambio entre periodos**. Si solo quieres
regenerar el resumen a partir de los JSON ya creados: `node scripts/build-summary.mjs`.

**Limitaciones de los datos**
- Son **diarios**: no hay horas, así que toda la app trabaja por días.
- Solo contienen viajes **entre barrios distintos** (ninguna fila con origen = destino). Por eso el índice de
  burbuja original («viajes que no salen del barrio») sale 0 %; está pendiente de definir con estos datos.
- Los acentos de los ficheros son UTF-8 correcto; si en Excel se ven como «GrÃ cia», es Excel abriéndolos
  con otra codificación (usar Datos → Desde texto/CSV → UTF-8).

## Qué puedes hacer

- **Tour** (botón amarillo arriba o tecla `T`): 19 pasos que muestran cada función. En cada paso la app se coloca sola
  (día, panel, colores, barrio, cámara) y un anillo amarillo señala el control del que se habla. Los textos se escriben
  con los datos cargados. Avanza con `→`, `Espacio`, `Intro` o un mando de presentaciones; `←` vuelve; `F` pantalla
  completa; `Esc` sale.
- **Línea de metro**: cada parada es un día laborable con su número de viajes. Reproducción a tres velocidades.
- **Periodo y tipo de viajero** en la barra inferior: cualquier mes, año o el total; residentes o visitantes.
- **Seis lecturas del mapa** (panel Mapa): actividad, cambio entre días, **cambio entre periodos** (nuevo),
  **visitantes** (nuevo: parte de quien llega que no vive en Barcelona, o solo internacionales), influencia de un
  barrio y burbuja. La **leyenda** está siempre visible y explica qué significa el color en cada modo.
- **Capas**: columnas 3D o plano, colmena 3D, viajes animados, arcos, burbujas, pulso, relieve, edificios, calles.
  Mapa base satélite o **plano** (vectorial, claro u oscuro).
- **Ficha de barrio**: llegadas, día fuerte, **evolución mes a mes** (nuevo, clic en un mes para cargarlo),
  **quién llega** (nuevo: residentes y visitantes de Cataluña, España y extranjero), destinos y orígenes, y su «ADN».
- **Comparador** de dos barrios.
- **Análisis**: ranking del día, diagrama de cuerdas entre distritos, hipótesis de la burbuja y hallazgos automáticos.
- **Tus datos**: arrastra un CSV y todo se recalcula. Exporta métricas y flujos en CSV.
- **Captura PNG** con leyenda y **enlace** que reproduce exactamente la vista.
- **Búsqueda** de barrios y acciones con `Ctrl K`.
- Bicing en directo (opcional, en Capas).

## Atajos

| Tecla | Acción |
|---|---|
| T | Empezar o salir del tour |
| Espacio | Reproducir / pausar |
| 1 – 5 | Ir de lunes a viernes |
| ← → | Día anterior / siguiente (en el tour: paso anterior / siguiente) |
| Ctrl K o / | Buscar |
| L | Mapa: capas y colores |
| R G B N | Análisis: ranking, distritos, burbujas, hallazgos |
| I | Datos |
| D | Comparar el día con el lunes |
| O | Órbita automática |
| H | Vista inicial |
| P | Captura |
| C | Comparar el barrio seleccionado |
| ? | Ayuda |

## Formato de un CSV propio

```csv
origen,destino,dia,viajes
Sants,la Vila de Gràcia,Lunes,4120
31,7,Martes,3500
```

- `origen` / `destino`: nombre oficial del barrio (con o sin artículo), su código 1–73 o el código oficial `080190101`.
  En los ficheros originales se usan `barrio_origen` / `barrio_destino` (la columna `origen` es el tipo de viajero).
- `dia`: lunes…viernes (también `dl`, `monday`, `1` = lunes) o una fecha. Si hay varias semanas, se promedian.
- `viajes`: número de viajes. Si falta la columna, cada fila cuenta como 1.

**Atributos** (opcional): `barrio,poblacion,restaurantes`. Los restaurantes pueden ir en número absoluto
(se convierten a «por 1.000 habitantes») o ya normalizados. Ambas plantillas se descargan desde el panel Datos.

> Si no se encuentran los datos de `public/data/movilidad`, la app usa datos **simulados** (modelo de gravedad).

## Fuentes y atribuciones

- Imágenes de satélite: Esri World Imagery (© Esri, Maxar, Earthstar Geographics).
- Relieve: Mapzen / AWS Terrain Tiles.
- Edificios y tipografías del mapa: OpenFreeMap, OpenMapTiles, © OpenStreetMap.
- Plano y rotulación: OpenFreeMap, OpenMapTiles, © OpenStreetMap (sin clave de API).
- Límites de barrios: Ajuntament de Barcelona (Open Data BCN), vía martgnz/bcn-geodata.
- Datos de movilidad: Telefónica (Càtedra Telefónica, UPF). Bicing: CityBikes API.

## Estructura

```
src/
  engine/        mapa (MapLibre + deck.gl), estilo, capas y bucle de animación
  model/         geometría, carga de datos reales, simulación, métricas diarias, importación CSV
  components/    interfaz (barra superior, navegación, paneles, ficha, línea de metro, tour, modales)
  lib/           colores, leyenda, pasos del tour, APIs, URL compartible
  store.js       estado global (zustand)
scripts/
  preprocess-mobility.mjs   ficheros crudos → public/data/movilidad (+ summary.json)
  build-summary.mjs         resumen ligero por periodo para la evolución y la comparación
```
