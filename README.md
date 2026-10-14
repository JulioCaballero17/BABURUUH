# Pulso de Barcelona

Observatorio 3D de la movilidad entre los 73 barrios de Barcelona, de lunes a viernes.
Mapa satélite real con relieve y edificios en 3D, iluminado por la posición real del sol,
con capas de datos animadas y paneles de análisis para el estudio de las «burbujas» de barrio.

## Cómo arrancarlo

Necesitas **Node.js 18 o superior** (recomendado el 20 LTS o el 22).

```bash
npm install
npm run dev
```

Se abre solo en `http://localhost:5173`. Recomendado Chrome o Edge en un ordenador con tarjeta gráfica;
si el equipo va justo, la app activa sola un «modo ligero» (sin desenfoque de los paneles).

Para generar la versión de producción: `npm run build` y `npm run preview`.

## Qué puedes hacer

- **Intro de cine**: la Tierra en 3D y un vuelo hasta Barcelona.
- **Semana completa**: línea de tiempo de lunes a viernes, hora a hora, con reproducción a tres velocidades.
  El mapa y la interfaz pasan de día a noche según el sol real de esa fecha.
- **Cuatro lecturas del mapa**: actividad (llegadas/km²), diferencia con otro día, índice de burbuja e influencia de un barrio.
- **Capas**: columnas 3D o plano por barrio, colmena hexagonal 3D, viajes animados, arcos de conexión,
  burbujas flotantes, pulso de los barrios más activos, relieve, edificios, rotulación.
- **Ficha de barrio**: llegadas, burbuja por día, pico semanal, mapa de calor 5 × 24 (clic para saltar a esa hora),
  destinos y orígenes, y su «ADN» comparado con la mediana de la ciudad.
- **Comparador** de dos barrios: curvas semanales, cifras, burbuja por día y ADN superpuesto.
- **Estudio de la hipótesis**: restaurantes por habitante frente a viajes nocturnos que no salen del barrio, con regresión.
- **Ranking en directo**, **diagrama de cuerdas** entre distritos y **hallazgos automáticos**.
- **Historias**: recorrido guiado de 7 capítulos, ideal para presentar (avanza con las flechas).
- **Datos en directo**: tiempo real y previsión de la semana (Open-Meteo) y estaciones de Bicing (CityBikes).
- **Tus datos**: arrastra un CSV y todo se recalcula. Exporta métricas y flujos en CSV.
- **Captura PNG** con leyenda y **enlace** que reproduce exactamente la vista (día, hora, barrio, cámara).
- **Búsqueda** de barrios y acciones con `Ctrl K`.

## Atajos

| Tecla | Acción |
|---|---|
| Espacio | Reproducir / pausar |
| 1 – 5 | Ir de lunes a viernes |
| ← → | Una hora atrás / adelante |
| Ctrl K o / | Buscar |
| L B R G S I | Capas, Burbujas, Ranking, Distritos, Historias, Datos |
| D | Comparar con el lunes |
| O | Órbita automática |
| H | Vista inicial |
| P | Captura |
| C | Comparar el barrio seleccionado |
| ? | Ayuda |

## Formato de los datos

**Flujos** (obligatorio para sustituir los simulados):

```csv
origen,destino,dia,hora,personas
Sants,la Vila de Gràcia,Lunes,8,412
31,7,Martes,9,350
```

- `origen` / `destino`: nombre oficial del barrio (con o sin artículo) o su código 1–73.
- `dia`: lunes…viernes (también `dl`, `monday`, `1` = lunes) o una fecha. Si hay varias semanas, se promedian.
- `hora`: `8`, `08:00` u `08:00-09:00`.
- `personas`: número de viajes. Si falta la columna, cada fila cuenta como 1.

**Atributos** (opcional): `barrio,poblacion,restaurantes`. Los restaurantes pueden ir en número absoluto
(se convierten a «por 1.000 habitantes») o ya normalizados. Ambas plantillas se descargan desde el panel Datos.

> Mientras no se importe nada, los datos son **simulados** con un modelo de gravedad (incluye efectos
> inventados como el partido del miércoles o el jueves universitario) para poder explorar la app.

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
  model/         geometría, simulación, métricas derivadas, importación CSV
  components/    interfaz (barra superior, paneles, ficha, timeline, modales)
  lib/           colores, sol y fechas, APIs, historias, URL compartible
  store.js       estado global (zustand)
```
