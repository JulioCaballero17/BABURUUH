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

## Qué hace Baburu

Cinco modos, arriba en el centro. Cada uno responde a una sola pregunta:

- **La semana** (`S`): cómo se mueve la ciudad cada día laborable. Columnas 3D por barrio (llegadas por km²),
  trayectos más fuertes animados y la semana como **línea de metro** abajo (con reproducción). Clic en un barrio:
  su ficha con evolución mes a mes, quién llega y adónde va su gente.
- **Metro** (`M`): el plano de metro que dibujaría la demanda. Cinco líneas (colores L1–L5) que siguen las rutas
  entre barrios vecinos con más viajes; trenes que se mueven según el día. No es el metro real.
- **Dónde abrir** (`A`): eliges un tipo de negocio (restauración y ocio, tienda para turistas, servicios para quien
  trabaja, comercio de barrio) y cada barrio recibe una puntuación de encaje; podio con los tres mejores y por qué.
- **Simulador** (`X`): ¿qué pasa si…? Gran evento (asistentes y barrio, clic en el mapa para moverlo), cierre de un
  barrio por obras o más teletrabajo. El mapa muestra qué barrios ganan o pierden gente y de dónde sale.
  Es una estimación a partir de los patrones reales.
- **Turismo** (`U`): parte de quien llega que es visitante (todos, extranjero, resto de España o de Cataluña),
  la temporada mes a mes, los barrios más turísticos y más de vecinos, y el metro dibujado solo por los visitantes.

El periodo y el tipo de viajero se eligen en la barra inferior y afectan a todos los modos.

**Tour** (`T`): 15 pasos por todos los modos, pensados para presentar. Avanza con `→`, `Espacio`, `Intro` o un mando
de presentaciones; `F` pantalla completa; `Esc` sale.

Todo se calcula solo con los datos de movilidad de Telefónica (y la población de cada barrio).

## Atajos

| Tecla | Acción |
|---|---|
| S · M · A · X · U | La semana · Metro · Dónde abrir · Simulador · Turismo |
| T | Empezar o salir del tour |
| Espacio | Reproducir / pausar |
| 1 – 5 | Ir de lunes a viernes |
| ← → | Día anterior / siguiente |
| Ctrl K o / | Buscar |
| O | Órbita automática |
| H | Vista inicial |
| P | Captura |
| Esc | Cerrar / volver a La semana |
| ? | Ayuda |

> Si no se encuentran los datos de `public/data/movilidad`, la app usa datos **simulados** (modelo de gravedad).

## Fuentes y atribuciones

- Imágenes de satélite: Esri World Imagery (© Esri, Maxar, Earthstar Geographics).
- Relieve: Mapzen / AWS Terrain Tiles.
- Edificios y tipografías del mapa: OpenFreeMap, OpenMapTiles, © OpenStreetMap.
- Plano y rotulación: OpenFreeMap, OpenMapTiles, © OpenStreetMap (sin clave de API).
- Límites de barrios: Ajuntament de Barcelona (Open Data BCN), vía martgnz/bcn-geodata.
- Datos de movilidad: Telefónica (Càtedra Telefónica, UPF).

## Estructura

```
src/
  engine/        mapa (MapLibre + deck.gl), estilo, capas y bucle de animación
  model/         geometría, carga de datos reales, métricas diarias y herramientas (tools.js)
  components/    interfaz (barra superior con los modos, paneles de herramientas, ficha, línea de metro, tour)
  lib/           colores, leyenda, pasos del tour, APIs, URL compartible
  store.js       estado global (zustand)
scripts/
  preprocess-mobility.mjs   ficheros crudos → public/data/movilidad (+ summary.json)
  build-summary.mjs         resumen ligero por periodo para la evolución y la comparación
```
