# Architecture — Prophet's Mosque Visitor Guide («next»)

> **ملخص بالعربية:** موقع ثابت بلا خادم، بطبقات تعتمد كل منها على ما تحتها فقط:
> **data ← domain ← routing ← location / i18n ← presentation ← state ← ui / map ← app**.
> الطبقات الخمس الأولى منقولة حرفياً من التطبيق الحالي، وهي التي تضمن أن البحث والمسارات وجدول الروضة ونتائج المواقف تبقى مطابقة.
> الجديد ثلاث طبقات:
> - **state:** حالة مشتركة بـsignals.
> - **ui:** مكوّنات Preact فوق الخريطة.
> - **map:** MapLibre GL، كل العلامات فيها طبقة GPU واحدة.

## 1. Shape of the system
- **Static site, no server, no accounts, no tracking.** Two pages: `index.html` (landing, Arabic prerendered at build time) and `map.html` (the app). Hosted later on a *new* Vercel project.
- **Everything runs on the device.** Search, routing (Dijkstra on the bundled graphs) and navigation run on the phone. The visitor's position never leaves it.
- **External requests:**
  - Map tiles: Esri World Imagery, and OSM standard tiles for the light base.
  - Weather: Open-Meteo, at fixed Madinah coordinates.
  - Nothing else. In particular there is no glyph or font server.
- **PWA:** the app shell, the data and the street graph are precached. Map tiles and story photos are never precached (tile licence, first-load weight).

## 2. Layers and the dependency rule
```
data/  (JSON source of truth, byte-identical to the live app)      scripts/ (rebuild data/ from documented sources)
   │
src/data          load + types + overrides                      ┐
src/domain        filters, search, facilities, parking, rawdah, │  ported verbatim from e0c6ca7
                  weather, geo, nearby, visits, library         │  pure: no DOM, no map library
src/routing       plaza walkways, streets, garage, plan, alts   │
src/location      LocationService, Kalman filter, RouteTrack    │  browser APIs only (MeMarker dropped)
src/i18n          t()/nm()/ds(), 26 languages, dir              ┘
src/presentation  pure view-model: marker look (tier, colour,     ← ported from ui/markers.ts + ui/poi-view.ts,
                  icon, size, visibility), card fields, labels      no DOM: unit-tested
src/navigation    NavigationTracker logic (progress, away, off-   ← ported logic; emits snapshots, no Leaflet, no DOM
                  route, switch, arrival, car-park steps)
src/state         signals: lang, theme, filter, query, selected, ← tiny, no DOM
                  sheet detent, travel, level, route, nav snapshot
src/ui            Preact components over the map                 ← never imports map/
src/map           MapLibre: setup, sources, layers, sprites,      ← never imports ui/
                  route layer, me-marker, camera
src/app           wiring for map.html (the only place ui ↔ map meet)
src/landing       landing page (view SSR'd at build time)
src/styles        tokens.css + Tailwind v4 entry + component CSS
```
**Rules.** They are enforced by `tests/unit/architecture.test.ts`, extended for the new folders.
1. A module imports only from layers above it in the diagram.
2. `domain/`, `routing/`, `presentation/` and `navigation/` never touch the DOM or `maplibre-gl`.
3. `ui/` and `map/` don't import each other. They meet only through `state/` signals and the wiring in `src/app/`.
4. Ported files keep their paths (`src/domain/search.ts` …), so a diff with the live app stays readable.

## 3. Folder tree
```
data/ scripts/ public/ docs/                 ported + new docs
src/
  data/ domain/ routing/ location/ i18n/     ported
  presentation/  marker-look.ts  place-view.ts  icons.ts
  navigation/    tracker.ts (ported logic)  steps.ts
  state/         store.ts (signals)  persist.ts (localStorage, try/catch)
  ui/
    kit/         Button IconButton Chip Toggle FloorSwitch Toast Skeleton Icon Ring
    shell/       TopBar SearchBar CategoryRow SubFilters MapControls WeatherChip
    sheet/       BottomSheet (spring) PlaceCard RouteCard StepBanner ArrivalCard GarageAsk
    search/      CommandPalette RecentSearches
    rawdah/      RawdahCard
    stories/     (lazy chunk)
    library/     (lazy chunk)
    admin/       (lazy chunk)
    lang/        LanguageMenu
  map/
    setup.ts       map, Esri + light raster sources, bounds, attribution, scale, rotation, compass
    zoom.ts        legacyZoom() — the one bridge between MapLibre zoom and the app's Leaflet-era thresholds
    pois.ts        one GeoJSON source, layers, filter expressions, feature-state (selected / closed)
    sprites.ts     icons, number chips and Arabic labels drawn once to canvas → map.addImage
    women-areas.ts fill layer from routing.json
    route.ts       base / focus / alternatives / arrows / car-park casings / markers
    me.ts          visitor dot (one DOM marker), glide, heading cone
    camera.ts      fly/fit with safe insets for top bar and sheet; reduced motion
  app/            map-main.ts (entry) · router.ts (?poi ?visit ?lib ?admin ?lang)
  landing/        view.ts (pure) · main.ts
  styles/         tokens.css · base.css · …
  design/         /design gallery (dev only, never in the production build)
tests/unit/  tests/e2e/  scripts/perf.mjs
```

## 4. Key flows
- **Filter / search → map.**
  - `ui` writes `filter` / `query` signals.
  - `app` computes `visiblePois()` (ported) into a `Set<number>` of ids.
  - `map/pois` applies one `setFilter(['in', ['get','id'], ['literal', ids]])` per layer.
  - Nothing is rebuilt and no GeoJSON is re-uploaded. Each change is O(n) once, not per frame.
- **Marker look.**
  - The look comes from `presentation/marker-look.ts` (ported rules: tier by zoom, 8/14/20 px, 4/5 px when zoomed out, gate chips from 17, inner numbers and names from 19, gold halo for the 9 must-visit sites, lock for subscriber lots).
  - It is baked into feature properties once at load, and expressed as zoom `step`/`interpolate` expressions.
  - The GPU does the rest.
- **Selection.**
  - Triggered by a marker tap, a search result or `?poi=ID`.
  - `selected` signal → `feature-state` on the place, and a filter that hides the other places (current behaviour).
  - `camera.flyTo` into the visible gap between the top bar and the sheet, and the sheet springs to half.
- **Route.**
  - The sheet's button triggers a location request, only now.
  - In or by the car park, `GarageAsk` asks where the car is.
  - `routing/plan.planRoutes` is lazy-imported on the first route.
  - `map/route.show(plans)` draws the route, and `navigation/tracker` starts.
  - Snapshots go to the `nav` signal, so the UI counters and the step banner update and `map/route.focus(ahead150)` follows.
  - Updating the "ahead" line is a `setData` on a ≤150 m line: tiny and bounded.
- **Language.**
  - Changing the `lang` signal sets `<html lang/dir>`, and the UI re-renders.
  - The map relabels: only the label sprites of the new language are drawn.
  - No reload.

## 5. Map: decisions and known pitfalls
- **Zoom scale.** MapLibre's world is 512 px at zoom 0. With 256 px raster tiles, MapLibre zoom = Leaflet zoom − 1.
  - Every threshold in the ported rules is a *Leaflet* zoom: default 17, max 19, 16/15/14 shrink steps, 17 gate chips, 18 pair numbers, 19 inner names.
  - They all pass through `legacyZoom()` in `map/zoom.ts`.
  - A test checks that the opening view frames the same outer-gate bounds as the live app.
- **Base layers.** Raster Esri (`tileSize: 256`, `maxzoom` 19 in tile terms) and OSM light.
  - Attribution is always visible: «Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics» + «© OpenStreetMap».
  - The first tiles are preloaded in `map.html` before JS, as in the live app, recomputed for MapLibre's scale.
- **Labels.** No external glyph server. Two options are decided in the Phase 1 spike (SPEC §9-5):
  - MapLibre's local text rendering, or
  - canvas sprites drawn with the app's own fonts (correct Arabic shaping by the browser).
- **Rotation.** Two-finger rotate and the ±15° buttons.
  - The compass needle follows true north, with the Kaaba mark toward the qibla.
  - Pitch is locked to 0 (SPEC §9-6).
- **Routes.**
  - Line layers with `lineMetrics: true`; the draw-in animates the `line-gradient` progress.
  - Level A gets a yellow casing; ramps get a yellow (up) or green (down) casing.
  - Arrows are a symbol layer with `symbol-placement: line`, spacing ≈ 55 m converted per zoom.
  - Alternatives are faint lines with a wide invisible hit line and a time label.
- **Visitor dot.** One DOM marker, glide 900 ms ease-out.
  - The accuracy circle is a GeoJSON circle (fill).
  - The heading cone is compensated for bearing.
- **Gesture hygiene.**
  - Nothing toggles classes on `<body>` during gestures.
  - No `backdrop-filter`.
  - No `move` listeners doing O(n) work.
  - UI panels are near-opaque (≥ 95%).

## 6. Dependencies (each with its reason; sizes are measured in Phase 1)
| Package | Why | Status |
|---|---|---|
| `maplibre-gl` | WebGL map: markers on the GPU instead of ~300 DOM nodes | **new — needs approval** (version: SPEC §9-5) |
| `preact` + `@preact/signals` | component UI with fine-grained updates, a few KB | **new — needs approval** (SPEC §9-4) |
| `vite`, `typescript`, `tailwindcss` + `@tailwindcss/vite`, `vite-plugin-pwa`, `workbox-window`, `vitest`, `@playwright/test` | build, styling, PWA, tests | as in the live app |
| `adhan`, `qrcode-generator`, `@fontsource/{noto-kufi-arabic, ibm-plex-sans-arabic, noto-naskh-arabic}` | Rawdah times, QR, fonts | as in the live app |
| ~~`leaflet`, `leaflet-rotate`, `@types/leaflet`~~ | — | removed |
Versions are pinned exactly (no `^`) and locked by `package-lock.json`. Only versions published at least two weeks earlier are used, unless a fix requires a newer one.

## 7. Code splitting and loading
- **Initial chunk:** app shell, map, top bar, category row, sheet and place card.
- **Lazy chunks:**
  - `routing`, together with `streets.json` and `garage.json`, on the first route.
  - `search` palette, on first focus.
  - `stories`, `library` and `admin`.
- `i18n.json` (1.18 MB, all 26 languages) is split at build time into one file per language. Only the visitor's language loads; the tests keep reading the original file.
- Fonts use `font-display: swap`, with Arabic + Latin subsets precached and other scripts on demand.

## 8. Integration points (unchanged)
- Deep links: `map.html?poi=<id>`, `?visit=<id>`, `?lib=<id>`, `?admin=1`, `?lang=<code>`.
- Works inside a WebView: no cookies, no login, no server.
- Plain JSON data with stable ids.
- Site config lives in `src/config/site.config.ts`: site URL, QR, light tiles, organisation name.

## 9. Quality gates
- `npm test`: Vitest, the ported unit tests + parity + new presentation, state and sheet-physics tests.
- `npm run test:e2e`: Playwright on the production build at phone size. The live app's journeys are rewritten one by one (`docs/PARITY.md`).
- `npm run build`: type-check + build.
- `npm run perf`: main-thread budgets (SPEC §6); frame times on a real device.
