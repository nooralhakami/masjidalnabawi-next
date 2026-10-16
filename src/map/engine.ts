import type { FeatureCollection, Point } from 'geojson';
import { AttributionControl, Map as MLMap, ScaleControl, setWorkerUrl, type ExpressionSpecification, type FilterSpecification, type GeoJSONSource } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { SITE } from '../config/site.config';
import { POIS, ROUTING, RULES } from '../data';
import type { Poi, Status } from '../data/types';
import { isClosed } from '../domain/facilities';
import type { FilterId } from '../domain/filters';
import { FEATURED_IDS } from '../domain/visits';
import { lookOf } from '../presentation/markers';
import { ICON_FROM, INNER_NUMBER_FROM, OUTER_CHIP_FROM, PAIR_NUMBER_FROM, GATE_NAME_FROM, markerLook } from '../presentation/marker-look';
import type { IconName } from '../presentation/icons';
import { IconAtlas, createDrawer, cssPalette, type Drawer } from './images';
import { LEGACY_MAX, LEGACY_MIN, fitView, haramBounds, legacyZoom, mapZoom } from './zoom';

setWorkerUrl(workerUrl);

export type BaseLayer = 'satellite' | 'light';

export interface PoiView {
  /** The places to show (the live app's visiblePois for the filter and search). */
  ids: readonly number[];
  filter: FilterId;
  /** Must-visit sites stay on the map with any filter, unless a search is running (as in the live app). */
  withFeatured: boolean;
  /** «Hide markers». */
  hidden: boolean;
}

export interface MapEngineOptions {
  container: HTMLElement;
  /** Name of a place in the visitor's language (gate labels). */
  nameOf(p: Poi): string;
  status(id: number): Status | undefined;
  onPick?(id: number): void;
  attribution?: { satellite: string; osm: string };
}

const DIRS: Record<string, string> = { south: 'dir-south', west: 'dir-west', north: 'dir-north', east: 'dir-east' };
const HIT_PX = 16;

/** Map zoom of a legacy (Leaflet) zoom threshold. */
const at = mapZoom;

/**
 * The map (SPEC F1, N1; ARCHITECTURE §5): Esri imagery (or a light map), one GeoJSON source for every
 * place, drawn by the GPU in a few layers, and the women's prayer areas. Filters change layer
 * filters only: no data is rebuilt while the visitor moves the map, nothing is done per frame for
 * each place, and no class is toggled on <body>.
 */
export class MapEngine {
  readonly map: MLMap;
  private version = 1;
  private view: PoiView = { ids: [], filter: 'all', withFeatured: true, hidden: false };
  private touched = false;
  private base: BaseLayer = 'satellite';
  private palette = cssPalette();
  private icons = new IconAtlas();
  private drawer!: Drawer;
  private pairs = POIS.filter((p) => p.pairNo !== undefined && p.pairWith !== undefined && p.id < p.pairWith);

  static async create(opts: MapEngineOptions): Promise<MapEngine> {
    const e = new MapEngine(opts);
    await e.ready;
    return e;
  }

  private ready: Promise<void>;

  private constructor(private opts: MapEngineOptions) {
    const { container } = opts;
    const fit = fitView(haramBounds(POIS), container.clientWidth || innerWidth, container.clientHeight || innerHeight);
    const tiles = RULES.map.tiles;
    this.map = new MLMap({
      container,
      center: [fit.center[1], fit.center[0]],
      zoom: at(fit.legacyZoom),
      minZoom: at(LEGACY_MIN),
      maxZoom: at(LEGACY_MAX),
      // Rotation yes, tilt no (SPEC §9-6): the imagery is flat and tilted routes read badly.
      maxPitch: 0,
      pitchWithRotate: false,
      dragRotate: true,
      touchPitch: false,
      attributionControl: false,
      fadeDuration: 150,
      style: {
        version: 8,
        sources: {
          esri: { type: 'raster', tileSize: 256, maxzoom: 19, tiles: [tiles.satellite], attribution: opts.attribution?.satellite ?? 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics' },
          // The light map is OpenStreetMap: its credit is the OpenStreetMap line that always shows (below).
          light: { type: 'raster', tileSize: 256, maxzoom: 19, tiles: [SITE.LIGHT_TILES] },
          // Default data tiles (to zoom 18: positions kept to under a centimetre). Larger tiles (maxzoom
          // 14–15) were measured and gave no gain beyond noise (docs/PERF.md), so the places are not rounded.
          women: { type: 'geojson', data: womenAreas() },
          pois: { type: 'geojson', data: this.features(), promoteId: 'id' },
          pairs: { type: 'geojson', data: this.pairFeatures() },
        },
        layers: [],
      },
    });
    this.map.touchZoomRotate.enableRotation();
    this.map.keyboard.enable();
    // Esri's line whenever its imagery shows; OpenStreetMap's always (the streets and routes come from it).
    this.map.addControl(new AttributionControl({ compact: false, customAttribution: opts.attribution?.osm ?? '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>' }), 'bottom-left');
    this.map.addControl(new ScaleControl({ unit: 'metric', maxWidth: 90 }), 'bottom-left');
    const ratio = Math.min(3, Math.max(1, devicePixelRatio || 1));
    const drawer = (this.drawer = createDrawer({
      palette: this.palette,
      icons: this.icons,
      ratio,
      labelOf: (id) => this.opts.nameOf(POIS.find((p) => p.id === id)!),
      dirOf: (id) => DIRS[POIS.find((p) => p.id === id)!.direction],
    }));
    // Marker images are drawn the first time the map needs one (images.ts). MapLibre 6 resolves a
    // missing image through this hook; the styleimagemissing event can no longer supply it.
    this.map.setMissingStyleImageResolver((id) => {
      const img = drawer.draw(id);
      if (img && !this.map.hasImage(id)) this.map.addImage(id, img.data, { pixelRatio: img.pixelRatio });
    });
    this.map.once('dragstart', () => (this.touched = true));
    this.map.once('zoomstart', (e) => e.originalEvent && (this.touched = true));
    this.map.on('click', (e) => this.pick(e.point.x, e.point.y));

    const icons = [...new Set(POIS.map((p) => lookOf(p).icon)), 'lock'] as IconName[];
    this.ready = Promise.all([
      this.icons.load(icons, ['#ffffff', this.palette.get('ink-800')]),
      document.fonts?.load(`600 11px "IBM Plex Sans Arabic"`).catch(() => undefined),
      new Promise<void>((r) => (this.map.loaded() ? r() : this.map.once('load', () => r()))),
    ]).then(() => this.addLayers());
  }

  // ---------- data ----------

  private features(): FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: POIS.map((p) => {
        const featured = FEATURED_IDS.has(p.id);
        const look = markerLook(p, featured);
        const plain = featured ? markerLook(p, false) : look;
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
          properties: {
            id: p.id,
            kind: look.kind,
            color: look.color,
            // A must-visit site drawn as a plain facility while a search runs: its own look and colour.
            look: plain.look,
            pcolor: plain.color,
            icon: look.icon,
            featured: featured ? 1 : 0,
            closed: isClosed(this.opts.status(p.id)) ? 1 : 0,
            named: look.named ? 1 : 0,
            sub: look.sub ? 1 : 0,
            z: look.z,
            n: p.id - 900,
          },
        };
      }),
    };
  }

  private pairFeatures(): FeatureCollection {
    const by = new Map(POIS.map((p) => [p.id, p]));
    return {
      type: 'FeatureCollection',
      features: this.pairs.map((a) => {
        const b = by.get(a.pairWith!)!;
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [(a.lng + b.lng) / 2, (a.lat + b.lat) / 2] },
          properties: { id: a.id, b: b.id, n: a.pairNo!, color: a.gender === 'men' ? 'cat-men' : 'cat-women' },
        };
      }),
    };
  }

  // ---------- layers ----------

  private img(...parts: (string | ExpressionSpecification)[]): ExpressionSpecification {
    return ['concat', ...parts, `@${this.version}`] as ExpressionSpecification;
  }

  private addLayers() {
    const m = this.map;
    // Measurement only (scripts/perf.mjs): ?layers=base draws the imagery alone, to find MapLibre's own floor.
    if (navigator.webdriver && new URLSearchParams(location.search).get('layers') === 'base') {
      m.addLayer({ id: 'esri', type: 'raster', source: 'esri' });
      m.addLayer({ id: 'light', type: 'raster', source: 'light', layout: { visibility: 'none' } });
      for (const id of ['facilities']) m.addLayer({ id, type: 'circle', source: 'pois', filter: ['literal', false] });
      return;
    }
    const white = '#ffffff';
    const symbol = { 'icon-allow-overlap': true, 'icon-ignore-placement': true } as const;
    m.addLayer({ id: 'esri', type: 'raster', source: 'esri' });
    m.addLayer({ id: 'light', type: 'raster', source: 'light', layout: { visibility: 'none' } });
    m.addLayer({ id: 'women-fill', type: 'fill', source: 'women', paint: { 'fill-color': this.palette.get('women-area-solid'), 'fill-opacity': 0.22 } });
    m.addLayer({ id: 'women-line', type: 'line', source: 'women', paint: { 'line-color': this.palette.get('women-area-solid'), 'line-opacity': 0.55, 'line-width': 1.5, 'line-dasharray': [4, 2.7] } });
    // Gates zoomed out: small dots in the side colour (the live app's .mk-gdot; 3 px at 15 and below).
    m.addLayer({
      id: 'inner-dots',
      type: 'circle',
      source: 'pois',
      paint: { 'circle-radius': ['step', ['zoom'], 1.5, at(16), 4], 'circle-color': this.colorOf(['get', 'color']), 'circle-stroke-color': white, 'circle-stroke-width': ['step', ['zoom'], 0.75, at(16), 1] },
    });
    m.addLayer({
      id: 'outer-dots',
      type: 'circle',
      source: 'pois',
      paint: { 'circle-radius': ['step', ['zoom'], 1.5, at(16), 3], 'circle-color': this.colorOf(['get', 'color']), 'circle-stroke-color': white, 'circle-stroke-width': ['step', ['zoom'], 0.75, at(16), 1] },
    });
    // Facilities up to 16: plain dots, 4 / 5 / 8 px with a white ring (1 / 1 / 1.5 px), drawn as GPU
    // circles (no symbol placement, the cheapest layer there is). Mixed restrooms are half blue, half
    // purple, which a circle cannot draw: those few stay images.
    m.addLayer({
      id: 'facility-dots',
      type: 'circle',
      source: 'pois',
      maxzoom: at(ICON_FROM),
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], at(14), 2, at(15), 2.5, at(16), 4],
        'circle-color': ['case', ['==', ['get', 'closed'], 1], this.palette.get('cat-gray'), this.colorOf(['get', 'pcolor'])],
        'circle-stroke-color': white,
        'circle-stroke-width': ['step', ['zoom'], 1, at(16), 1.5],
      },
    });
    m.addLayer({
      id: 'mixed-dots',
      type: 'symbol',
      source: 'pois',
      maxzoom: at(ICON_FROM),
      layout: { ...symbol, 'icon-image': this.img('dot:mixed:', ['to-string', ['get', 'closed']]), 'icon-size': ['interpolate', ['linear'], ['zoom'], at(14), 0.5, at(15), 0.625, at(16), 1] },
    });
    // From 17: the disc with its icon, 14 px (20 px at 19).
    m.addLayer({
      id: 'facilities',
      type: 'symbol',
      source: 'pois',
      minzoom: at(ICON_FROM),
      layout: {
        ...symbol,
        'symbol-sort-key': ['get', 'z'],
        'icon-image': this.img('fac:', ['get', 'look'], ':', ['to-string', ['get', 'closed']]),
        'icon-size': ['interpolate', ['linear'], ['zoom'], at(17), 0.7, at(18), 0.7, at(19), 1],
      },
    });
    m.addLayer({
      id: 'parking',
      type: 'symbol',
      source: 'pois',
      layout: { ...symbol, 'icon-image': this.img('park:', ['to-string', ['get', 'n']], ':', ['to-string', ['get', 'sub']]), 'icon-size': ['step', ['zoom'], 0.7, at(16), 1], 'icon-anchor': 'center' },
    });
    // Outer-gate number chips from 17; one that would overlap another stays a dot (the live app's «compact»).
    m.addLayer({
      id: 'outer-chips',
      type: 'symbol',
      source: 'pois',
      minzoom: at(OUTER_CHIP_FROM),
      layout: { 'icon-image': this.img('gate:', ['to-string', ['get', 'id']]), 'icon-size': ['step', ['zoom'], 17 / 19, at(19), 1], 'icon-padding': 1, 'symbol-sort-key': ['get', 'id'] },
    });
    m.addLayer({
      id: 'inner-numbers',
      type: 'symbol',
      source: 'pois',
      minzoom: at(INNER_NUMBER_FROM),
      layout: { ...symbol, 'icon-image': this.img('inum:', ['to-string', ['get', 'id']], ':', ['get', 'color']) },
    });
    m.addLayer({
      id: 'pairs',
      type: 'symbol',
      source: 'pairs',
      minzoom: at(PAIR_NUMBER_FROM),
      layout: { ...symbol, 'icon-image': this.img('pair:', ['to-string', ['get', 'n']], ':', ['get', 'color']) },
    });
    // Named gates' labels at 19, beside the number, never on top of a chip or another label.
    m.addLayer({
      id: 'gate-names',
      type: 'symbol',
      source: 'pois',
      minzoom: at(GATE_NAME_FROM),
      layout: { 'icon-image': this.img('name:', ['to-string', ['get', 'id']]), 'icon-anchor': 'left', 'icon-offset': [26, 0], 'icon-padding': 2, 'symbol-sort-key': ['get', 'id'] },
    });
    // Must-visit sites on top: same size at every zoom (30 px at 19), with their halo.
    m.addLayer({
      id: 'featured',
      type: 'symbol',
      source: 'pois',
      layout: { ...symbol, 'icon-image': this.img('feat:', ['get', 'icon']), 'icon-size': ['step', ['zoom'], 1, at(19), 30 / 24] },
    });
    this.applyView();
    this.prewarm();
  }

  /**
   * Draw the marker images ahead, a few at a time while the browser is idle, so that zooming past 17
   * or 19 does not draw a hundred of them in one go (a long task the visitor would feel).
   */
  private prewarm() {
    const v = this.version;
    const ids: string[] = [];
    for (const f of this.features().features) {
      const p = f.properties as Record<string, string | number>;
      if (p.kind === 'facility' || p.kind === 'featured') ids.push(`fac:${p.look}:${p.closed}@${v}`);
      if (p.pcolor === 'mixed') ids.push(`dot:mixed:${p.closed}@${v}`);
      if (p.kind === 'featured') ids.push(`feat:${p.icon}@${v}`);
      if (p.kind === 'gate-outer') ids.push(`gate:${p.id}@${v}`);
      if (p.kind === 'gate-inner') ids.push(`inum:${p.id}:${p.color}@${v}`);
      if (p.kind === 'gate-inner' && p.named) ids.push(`name:${p.id}@${v}`);
      if (p.kind === 'parking') ids.push(`park:${p.n}:${p.sub}@${v}`);
    }
    for (const f of this.pairFeatures().features) ids.push(`pair:${f.properties!.n}:${f.properties!.color}@${v}`);
    const queue = [...new Set(ids)];
    const idle: (cb: (d: { timeRemaining(): number }) => void) => void = (window as unknown as { requestIdleCallback?: typeof idle }).requestIdleCallback ?? ((cb) => setTimeout(() => cb({ timeRemaining: () => 8 }), 16));
    const step = (d: { timeRemaining(): number }) => {
      if (v !== this.version) return;
      while (queue.length && d.timeRemaining() > 2) {
        const id = queue.shift()!;
        if (this.map.hasImage(id)) continue;
        const img = this.drawer.draw(id);
        if (img) this.map.addImage(id, img.data, { pixelRatio: img.pixelRatio });
      }
      if (queue.length) idle(step);
    };
    idle(step);
  }

  /** A colour token on a feature, as a paint colour (read from tokens.css). */
  private colorOf(get: ExpressionSpecification): ExpressionSpecification {
    const tokens = ['dir-south', 'dir-west', 'dir-north', 'dir-east', 'cat-women', 'cat-men', 'cat-acc', 'cat-hotel', 'cat-food', 'cat-land', 'cat-emg', 'cat-shop', 'cat-hist', 'cat-park-sub', 'cat-gray'];
    return ['match', get, ...tokens.flatMap((t) => [t, this.palette.get(t)]), this.palette.get('cat-land')] as unknown as ExpressionSpecification;
  }

  // ---------- what is shown ----------

  /** The places on the map now, must-visit sites included (for the tests and the app). */
  get shownIds(): number[] {
    return this.view.hidden ? [] : [...new Set([...this.view.ids, ...(this.view.withFeatured ? FEATURED_IDS : [])])];
  }

  /** Every place a visitor can find (the hidden wheelchair areas aside). */
  get allIds(): number[] {
    return POIS.filter((p) => p.subCategory !== 'wheelchair_zone').map((p) => p.id);
  }

  poi(id: number): Poi | undefined {
    return POIS.find((p) => p.id === id);
  }

  /** Show these places (a filter, a search): layer filters only, the data stays as it is. */
  setView(v: PoiView): void {
    this.view = v;
    if (this.map.getLayer('facilities')) this.applyView();
  }

  private applyView() {
    const { ids, filter, withFeatured, hidden } = this.view;
    const shown = ['in', ['get', 'id'], ['literal', [...ids, ...(withFeatured ? [...FEATURED_IDS] : [])]]] as unknown as ExpressionSpecification;
    const kind = (k: string) => ['==', ['get', 'kind'], k] as ExpressionSpecification;
    const featuredDrawn = (withFeatured ? ['==', ['get', 'featured'], 1] : ['literal', false]) as ExpressionSpecification;
    const set = (layer: string, f: ExpressionSpecification) => this.map.setFilter(layer, (hidden ? ['literal', false] : ['all', shown, f]) as FilterSpecification);
    set('inner-dots', kind('gate-inner'));
    set('outer-dots', kind('gate-outer'));
    set('outer-chips', kind('gate-outer'));
    set('inner-numbers', kind('gate-inner'));
    set('gate-names', ['all', kind('gate-inner'), ['==', ['get', 'named'], 1]] as ExpressionSpecification);
    set('parking', kind('parking'));
    const facility = ['any', kind('facility'), ['all', kind('featured'), ['!', featuredDrawn]]] as ExpressionSpecification;
    const mixed = ['==', ['get', 'pcolor'], 'mixed'] as ExpressionSpecification;
    set('facilities', facility);
    set('facility-dots', ['all', facility, ['!', mixed]] as ExpressionSpecification);
    set('mixed-dots', ['all', facility, mixed] as ExpressionSpecification);
    set('featured', ['all', kind('featured'), featuredDrawn] as ExpressionSpecification);
    // The number between a pair's two markers, only while both are on the map.
    const both = ['all', ['in', ['get', 'id'], ['literal', [...ids]]], ['in', ['get', 'b'], ['literal', [...ids]]]] as unknown as ExpressionSpecification;
    this.map.setFilter('pairs', (hidden ? ['literal', false] : both) as FilterSpecification);
    // Zoomed out (≤ 16) with «All», inner gates wait until 17; a gates filter shows them at any zoom (visibleAtZoom).
    this.map.setLayerZoomRange('inner-dots', filter === 'all' ? at(17) : 0, 24);
  }

  /** A facility opened or closed (admin simulator): its look is in the data, so the data is refreshed once. */
  refreshStatus(): void {
    (this.map.getSource('pois') as GeoJSONSource | undefined)?.setData(this.features());
  }

  /** Theme or language changed: colours and labels are drawn again, lazily. */
  restyle(): void {
    this.palette.reset();
    const old = this.version;
    this.version++;
    if (!this.map.getLayer('facilities')) return;
    this.map.removeLayer('featured');
    for (const id of ['esri', 'light', 'women-fill', 'women-line', 'inner-dots', 'outer-dots', 'facility-dots', 'mixed-dots', 'facilities', 'parking', 'outer-chips', 'inner-numbers', 'pairs', 'gate-names']) if (this.map.getLayer(id)) this.map.removeLayer(id);
    for (const id of this.map.listImages()) if (id.endsWith(`@${old}`)) this.map.removeImage(id);
    this.addLayers();
    this.setBase(this.base);
  }

  // ---------- base map, camera ----------

  setBase(kind: BaseLayer): void {
    this.base = kind;
    if (!this.map.getLayer('esri')) return;
    this.map.setLayoutProperty('esri', 'visibility', kind === 'satellite' ? 'visible' : 'none');
    this.map.setLayoutProperty('light', 'visibility', kind === 'light' ? 'visible' : 'none');
  }

  get baseLayer(): BaseLayer {
    return this.base;
  }

  /** The visitor's turn of the map, as the live app's buttons: +15° turns the map clockwise. */
  turn(deg: number): void {
    this.map.rotateTo(this.map.getBearing() - deg, { duration: reduce() ? 0 : 250 });
  }

  resetNorth(): void {
    this.map.rotateTo(0, { duration: reduce() ? 0 : 300 });
  }

  zoomBy(step: number): void {
    this.map.zoomTo(Math.round(this.map.getZoom()) + step, { duration: reduce() ? 0 : 250 });
  }

  /** Where true north points on screen, in degrees clockwise (for the compass needle). */
  get north(): number {
    return -this.map.getBearing();
  }

  get legacyZoom(): number {
    return legacyZoom(this.map.getZoom());
  }

  /** After a resize, fit the Haram again — unless the visitor has already moved the map (as the live app). */
  refit(): void {
    if (this.touched) return;
    const c = this.map.getContainer();
    const fit = fitView(haramBounds(POIS), c.clientWidth, c.clientHeight);
    this.map.jumpTo({ center: [fit.center[1], fit.center[0]], zoom: at(fit.legacyZoom) });
  }

  // ---------- picking ----------

  /** The place under a tap: the nearest marker within 16 px (the live app's 32 px hit area). */
  private pick(x: number, y: number) {
    const layers = ['featured', 'facilities', 'facility-dots', 'mixed-dots', 'parking', 'outer-chips', 'inner-numbers', 'outer-dots', 'inner-dots'].filter((l) => this.map.getLayer(l));
    const hits = this.map.queryRenderedFeatures(
      [
        [x - HIT_PX, y - HIT_PX],
        [x + HIT_PX, y + HIT_PX],
      ],
      { layers },
    );
    let best: { id: number; d: number } | null = null;
    for (const f of hits) {
      const [lng, lat] = (f.geometry as Point).coordinates;
      const p = this.map.project([lng, lat]);
      const d = Math.hypot(p.x - x, p.y - y);
      if (!best || d < best.d) best = { id: Number(f.properties.id), d };
    }
    if (best) this.opts.onPick?.(best.id);
  }
}

function womenAreas(): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: (ROUTING.women_prayer_areas ?? []).map((a) => ({
      type: 'Feature',
      properties: { id: a.id },
      geometry: { type: 'Polygon', coordinates: [[...a.polygon, a.polygon[0]].map(([lat, lng]) => [lng, lat])] },
    })),
  };
}

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
