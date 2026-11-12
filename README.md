# Pulso de Barcelona

Observatorio 3D de la movilidad entre los 73 barrios de Barcelona, de lunes a viernes, con **datos reales
diarios** (enero 2023 – agosto 2025). Mapa satélite con relieve y edificios en 3D, capas de datos animadas
y paneles de análisis para el estudio de las «burbujas» de barrio.

## Cómo arrancarlo

Necesitas **Node.js 18 o superior** (recomendado el 20 LTS o el 22).

```bash
npm install
npm run dev
```

Se abre solo en `http://localhost:5173`. Recomendado Chrome o Edge en un ordenador con tarjeta gráfica;
si el equipo va justo, la app activa sola un «modo ligero» (sin desenfoque de los paneles).

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

**Limitaciones de los datos**
- Son **diarios**: no hay horas, así que toda la app trabaja por días.
- Solo contienen viajes **entre barrios distintos** (ninguna fila con origen = destino). Por eso el índice de
  burbuja original («viajes que no salen del barrio») sale 0 %; está pendiente de definir con estos datos.
- Los acentos de los ficheros son UTF-8 correcto; si en Excel se ven como «GrÃ cia», es Excel abriéndolos
  con otra codificación (usar Datos → Desde texto/CSV → UTF-8).

## Qué puedes hacer

- **Intro de cine**: la Tierra en 3D y un vuelo hasta Barcelona.
- **Semana media**: de lunes a viernes, día a día, con reproducción a tres velocidades.
- **Periodo y tipo de viajero**: cualquier mes, año o el total; todos los viajeros, residentes o visitantes.
- **Cuatro lecturas del mapa**: actividad (llegadas/km²), diferencia con otro día, índice de burbuja e influencia de un barrio.
- **Capas**: columnas 3D o plano por barrio, colmena hexagonal 3D, viajes animados, arcos de conexión,
  burbujas flotantes, pulso de los barrios más activos, relieve, edificios, rotulación.
- **Ficha de barrio**: llegadas por día (clic para saltar a ese día), día con más llegadas,
  destinos y orígenes, y su «ADN» comparado con la mediana de la ciudad.
- **Comparador** de dos barrios: llegadas por día, cifras, burbuja por día y ADN superpuesto.
- **Estudio de la hipótesis**: restaurantes por habitante frente al índice de burbuja, con regresión.
- **Ranking en directo**, **diagrama de cuerdas** entre distritos y **hallazgos automáticos**.
- **Historias**: recorrido guiado escrito a partir de los datos, ideal para presentar (avanza con las flechas).
- **Datos en directo**: tiempo real y previsión de la semana (Open-Meteo) y estaciones de Bicing (CityBikes).
- **Tus datos**: arrastra un CSV (también un fichero mensual original) y todo se recalcula. Exporta métricas y flujos en CSV.
- **Captura PNG** con leyenda y **enlace** que reproduce exactamente la vista (día, periodo, tipo de viajero, barrio, cámara).
- **Búsqueda** de barrios y acciones con `Ctrl K`.

## Atajos

| Tecla | Acción |
|---|---|
| Espacio | Reproducir / pausar |
| 1 – 5 | Ir de lunes a viernes |
| ← → | Día anterior / siguiente |
| Ctrl K o / | Buscar |
| L B R G S I | Capas, Burbujas, Ranking, Distritos, Historias, Datos |
| D | Comparar con el lunes |
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
- Rotulación y cartografía: © CARTO, © OpenStreetMap.
- Límites de barrios: Ajuntament de Barcelona (Open Data BCN), vía martgnz/bcn-geodata.
- Tiempo: Open-Meteo. Bicing: CityBikes API.

## Estructura

```
src/
  engine/        mapa (MapLibre + deck.gl), estilo, capas y bucle de animación
  model/         geometría, carga de datos reales, simulación, métricas diarias, importación CSV
  components/    interfaz (barra superior, paneles, ficha, timeline, modales)
  lib/           colores, días, APIs, historias, URL compartible
  store.js       estado global (zustand)
scripts/
  preprocess-mobility.mjs   ficheros crudos → public/data/movilidad
```
