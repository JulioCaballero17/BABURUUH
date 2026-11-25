import { BARRIOS_GEOJSON, LABELS_GEOJSON, HEX_GEOJSON } from '../model/geo.js'
import { RAMP_ACTIVITY, rampStops } from '../lib/colors.js'

// The street map ("Plano") is drawn from OpenFreeMap vector tiles, so it needs no API key and follows
// the interface colours. CARTO raster tiles now require a key (they showed "API KEY REQUIRED").
export const PLANO = {
  light: { bg: '#E9ECE8', water: '#BFD0DA', park: '#D5E1CC', road: '#FFFFFF', roadMinor: '#F6F7F4', roadCase: '#CDD2CF', rail: '#B9BEBB', label: '#3B4148', halo: '#F4F6F3' },
  dark: { bg: '#15181C', water: '#0D1C29', park: '#18241D', road: '#2C3239', roadMinor: '#22272D', roadCase: '#101215', rail: '#30363D', label: '#AEB6BF', halo: '#0E1013' },
}
export const PLANO_LAYERS = ['plano-bg', 'plano-park', 'plano-water', 'plano-road-case', 'plano-road-minor', 'plano-road', 'plano-rail']
export const LABEL_LAYERS = ['lbl-roads', 'lbl-places']

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
      { id: 'plano-bg', type: 'background', layout: { visibility: 'none' }, paint: { 'background-color': PLANO.light.bg } },
      { id: 'plano-park', type: 'fill', source: 'omt', 'source-layer': 'park', layout: { visibility: 'none' }, paint: { 'fill-color': PLANO.light.park } },
      { id: 'plano-water', type: 'fill', source: 'omt', 'source-layer': 'water', layout: { visibility: 'none' }, paint: { 'fill-color': PLANO.light.water } },
      {
        id: 'plano-road-case', type: 'line', source: 'omt', 'source-layer': 'transportation', layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
        filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary'], true, false],
        paint: { 'line-color': PLANO.light.roadCase, 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 10, 1.5, 16, 14] },
      },
      {
        id: 'plano-road-minor', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 12.5, layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
        filter: ['match', ['get', 'class'], ['tertiary', 'minor', 'service'], true, false],
        paint: { 'line-color': PLANO.light.roadMinor, 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 12.5, 0.5, 16, 6] },
      },
      {
        id: 'plano-road', type: 'line', source: 'omt', 'source-layer': 'transportation', layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
        filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary'], true, false],
        paint: { 'line-color': PLANO.light.road, 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 10, 0.8, 16, 11] },
      },
      {
        id: 'plano-rail', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 11, layout: { visibility: 'none' },
        filter: ['==', ['get', 'class'], 'rail'],
        paint: { 'line-color': PLANO.light.rail, 'line-width': 1, 'line-dasharray': [3, 3] },
      },
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
          'line-color': ['case', ['boolean', ['feature-state', 'sel'], false], '#FFC72C', 'rgba(255,255,255,0.9)'],
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
          'circle-color': ['interpolate', ['linear'], ['get', 'ratio'], 0, '#D9607F', 0.15, '#E8B04A', 0.45, '#E9DC7A', 1, '#4DB6A0'],
          'circle-stroke-color': 'rgba(255,255,255,0.8)',
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 11, 0.4, 15, 1.2],
          'circle-pitch-alignment': 'map',
        },
      },
      {
        id: 'lbl-roads', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 13,
        filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'], true, false],
        layout: { 'symbol-placement': 'line', 'text-field': ['coalesce', ['get', 'name:latin'], ['get', 'name']], 'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 13, 10, 16, 13], 'text-max-angle': 30 },
        paint: { 'text-color': 'rgba(255,255,255,0.92)', 'text-halo-color': 'rgba(10,12,14,0.8)', 'text-halo-width': 1.2 },
      },
      {
        id: 'lbl-places', type: 'symbol', source: 'omt', 'source-layer': 'place', maxzoom: 12.2,
        filter: ['match', ['get', 'class'], ['city', 'town'], true, false],
        layout: { 'text-field': ['coalesce', ['get', 'name:latin'], ['get', 'name']], 'text-font': ['Noto Sans Bold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 8, 11, 12, 15], 'text-transform': 'uppercase', 'text-letter-spacing': 0.12 },
        paint: { 'text-color': 'rgba(255,255,255,0.9)', 'text-halo-color': 'rgba(10,12,14,0.75)', 'text-halo-width': 1.4 },
      },
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
          'text-halo-color': 'rgba(14,16,18,0.88)',
          'text-halo-width': 1.4,
          'text-opacity': ['interpolate', ['linear'], ['zoom'], 12.2, 0, 12.6, 0.95],
        },
      },
      // darkens the whole map behind the metro plan and the moving particles
      { id: 'metro-dim', type: 'background', paint: { 'background-color': '#0E1012', 'background-opacity': 0 } },
    ],
  }
}
