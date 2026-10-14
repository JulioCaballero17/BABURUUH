import { BARRIOS_GEOJSON, LABELS_GEOJSON, HEX_GEOJSON } from '../model/geo.js'
import { RAMP_ACTIVITY, rampStops } from '../lib/colors.js'

const carto = (kind) => ['a', 'b', 'c', 'd'].map((s) => `https://${s}.basemaps.cartocdn.com/${kind}/{z}/{x}/{y}@2x.png`)

export const rampExpr = (ramp, min = 0, max = 1) => ['interpolate', ['linear'], ['coalesce', ['feature-state', 'v'], 0], ...rampStops(ramp, min, max)]

export function buildStyle() {
  return {
    version: 8,
    projection: { type: 'globe' },
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sky: {
      'sky-color': '#0b1a2e',
      'horizon-color': '#3a5576',
      'fog-color': '#0d1624',
      'sky-horizon-blend': 0.6,
      'horizon-fog-blend': 0.7,
      'fog-ground-blend': 0.25,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 8, 1, 11, 0],
    },
    sources: {
      satellite: {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        maxzoom: 19,
        attribution: 'Imágenes © Esri, Maxar, Earthstar Geographics',
      },
      'carto-light': { type: 'raster', tiles: carto('light_all'), tileSize: 256, attribution: '© CARTO © OpenStreetMap' },
      'carto-dark': { type: 'raster', tiles: carto('dark_all'), tileSize: 256, attribution: '© CARTO © OpenStreetMap' },
      'labels-light': { type: 'raster', tiles: carto('light_only_labels'), tileSize: 256 },
      'labels-dark': { type: 'raster', tiles: carto('dark_only_labels'), tileSize: 256 },
      terrain: {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 14,
        attribution: 'Relieve: Mapzen / AWS Terrain Tiles',
      },
      omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet', attribution: '© OpenFreeMap © OpenMapTiles © OpenStreetMap' },
      barrios: { type: 'geojson', data: BARRIOS_GEOJSON },
      'barrio-labels': { type: 'geojson', data: LABELS_GEOJSON },
      hex: { type: 'geojson', data: HEX_GEOJSON },
      bicing: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#0a1018' } },
      { id: 'satellite', type: 'raster', source: 'satellite', paint: { 'raster-saturation': -0.12, 'raster-contrast': 0.06, 'raster-fade-duration': 200 } },
      { id: 'basemap-light', type: 'raster', source: 'carto-light', layout: { visibility: 'none' } },
      { id: 'basemap-dark', type: 'raster', source: 'carto-dark', layout: { visibility: 'none' } },
      {
        id: 'barrios-fill',
        type: 'fill',
        source: 'barrios',
        paint: {
          'fill-color': rampExpr(RAMP_ACTIVITY),
          'fill-opacity': ['interpolate', ['linear'], ['zoom'], 12.6, ['case', ['boolean', ['feature-state', 'dim'], false], 0.005, 0.04], 14.6, ['case', ['boolean', ['feature-state', 'dim'], false], 0.05, 0.42]],
          'fill-opacity-transition': { duration: 0 },
        },
      },
      {
        id: 'barrios-line',
        type: 'line',
        source: 'barrios',
        paint: { 'line-color': 'rgba(255,255,255,0.55)', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.4, 14, 1.2], 'line-opacity': 0.55 },
      },
      {
        id: 'hex-ext',
        type: 'fill-extrusion',
        source: 'hex',
        layout: { visibility: 'none' },
        paint: {
          'fill-extrusion-color': rampExpr(RAMP_ACTIVITY),
          'fill-extrusion-height': ['coalesce', ['feature-state', 'h'], 0],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.92,
          'fill-extrusion-vertical-gradient': true,
        },
      },
      {
        id: 'buildings',
        type: 'fill-extrusion',
        source: 'omt',
        'source-layer': 'building',
        minzoom: 13,
        paint: {
          'fill-extrusion-color': '#ddd8cd',
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, 0, 14.4, ['coalesce', ['get', 'render_height'], 8]],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': 0.88,
        },
      },
      {
        id: 'barrios-3d',
        type: 'fill-extrusion',
        source: 'barrios',
        paint: {
          'fill-extrusion-color': rampExpr(RAMP_ACTIVITY),
          'fill-extrusion-height': ['coalesce', ['feature-state', 'h'], 0],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 11, 0.86, 13.1, 0.8, 14.6, 0.1],
          'fill-extrusion-vertical-gradient': true,
        },
      },
      {
        id: 'barrios-focus',
        type: 'line',
        source: 'barrios',
        paint: {
          'line-color': ['case', ['boolean', ['feature-state', 'sel'], false], '#FFFFFF', 'rgba(255,255,255,0.85)'],
          'line-width': ['case', ['boolean', ['feature-state', 'sel'], false], 3, ['boolean', ['feature-state', 'hov'], false], 1.6, 0],
          'line-blur': 0.4,
        },
      },
      {
        id: 'bicing',
        type: 'circle',
        source: 'bicing',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, ['interpolate', ['linear'], ['get', 'cap'], 0, 1.5, 40, 4], 15, ['interpolate', ['linear'], ['get', 'cap'], 0, 4, 40, 11]],
          'circle-color': ['interpolate', ['linear'], ['get', 'ratio'], 0, '#B44663', 0.15, '#E59A86', 0.45, '#E6D5A9', 1, '#5FBFAE'],
          'circle-stroke-color': 'rgba(255,255,255,0.8)',
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 11, 0.4, 15, 1.2],
          'circle-pitch-alignment': 'map',
        },
      },
      { id: 'labels-light', type: 'raster', source: 'labels-light', paint: { 'raster-opacity': 0.9 } },
      { id: 'labels-dark', type: 'raster', source: 'labels-dark', paint: { 'raster-opacity': 0 } },
      {
        id: 'barrio-names',
        type: 'symbol',
        source: 'barrio-labels',
        minzoom: 12.2,
        layout: {
          'text-field': ['get', 'short'],
          'text-font': ['Noto Sans Bold'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 12.2, 10.5, 15, 14],
          'text-letter-spacing': 0.04,
          'text-transform': 'uppercase',
          'symbol-sort-key': ['-', 0, ['get', 'rank']],
          'text-padding': 6,
        },
        paint: {
          'text-color': '#FFFFFF',
          'text-halo-color': 'rgba(8,12,18,0.85)',
          'text-halo-width': 1.4,
          'text-opacity': ['interpolate', ['linear'], ['zoom'], 12.2, 0, 12.6, 0.95],
        },
      },
    ],
  }
}
