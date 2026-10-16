/*
 * map.html — the map with everything over it: search, categories, the place card (phase 4).
 * Routes and navigation come in phase 5, the Rawdah card, stories, library and languages in phase 6.
 */
import { computed, effect } from '@preact/signals';
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import '../styles/fonts';
import '../styles/main.css';
import { POI_BY_ID } from '../data';
import { Facilities } from '../domain/facilities';
import { isHidden } from '../domain/filters';
import { visiblePois } from '../domain/visible';
import { VISIT_LIST } from '../domain/visits';
import { currentWeather, WEATHER_TTL_MS, type Weather } from '../domain/weather';
import { getLang, nm, t } from '../i18n';
import { applyLang, initialLang } from '../i18n/dom';
import { loadLang } from '../i18n-next/load';
import { MapEngine, type BaseLayer } from '../map/engine';
import { filter, markersHidden, nav, parkingSub, query, rawdahH, searching, selected, sheetH, toiletSub } from '../state/store';
import { LangContext } from '../ui/i18n';
import { MapControls, MapTools } from '../ui/shell/MapControls';
import { WeatherChip } from '../ui/shell/WeatherChip';
import { MapError } from '../ui/shell/MapError';
import { applyTheme, savedTheme } from '../ui/theme';
import { App } from './App';
import { initPwa } from './pwa';
import { Trip } from './trip';

applyTheme(savedTheme(), false);
// The visitor's language: its texts arrive (their own file) before anything is drawn, in main().
const firstLang = initialLang();
document.documentElement.lang = firstLang;

const root = document.getElementById('app')!;
root.innerHTML =
  '<div class="map-page"><div id="map" class="map-root" role="application"></div><div class="map-overlay" id="overlay"></div><div class="map-overlay-left" id="overlay-left"></div><div id="ui"></div></div>';

const fac = new Facilities();

async function main() {
  await loadLang(firstLang);
  applyLang(firstLang);
  document.title = t('title');
  let engine: MapEngine;
  try {
    engine = await MapEngine.create({
      container: document.getElementById('map')!,
      nameOf: (p) => nm(p),
      status: (id) => fac.status(id),
      onPick: (id) => document.dispatchEvent(new CustomEvent('map-tap', { detail: id })),
      routeText: { minutes: (m) => t('r_min', { t: m }), level: (l) => t('lvl_name', { l }), entrance: (p) => nm(p) },
      meLabel: () => t('you'),
    });
  } catch {
    // No map on this device (no WebGL, or refused): say so instead of a blank page.
    render(
      <LangContext.Provider value={getLang()}>
        <MapError onRetry={() => location.reload()} />
      </LangContext.Provider>,
      document.getElementById('ui')!,
    );
    return;
  }

  const trip = new Trip(engine, {
    top: () => document.querySelector('.app-top')?.getBoundingClientRect().bottom ?? 0,
    sheet: () => sheetH.value,
    bar: () => document.querySelector('.nav-bar, .garage-ask')?.getBoundingClientRect().top ?? innerHeight - sheetH.value,
  });

  // The map follows the state: the places of the filter and search, and the card that is open.
  effect(() => {
    const ids = visiblePois(filter.value, toiletSub.value, query.value, fac, undefined, parkingSub.value).map((p) => p.id);
    engine.setView({ ids, filter: filter.value, withFeatured: !searching.value, hidden: markersHidden.value });
  });
  effect(() => engine.select(selected.value));
  // The map's buttons sit above what is at the bottom: while navigating, the sheet and the bar
  // (the live app's body.is-navigating rule); with no card open, the Rawdah cards. Written on the two
  // button columns, never as a class on <body>.
  const navigating = computed(() => nav.value !== null);
  const open = computed(() => selected.value !== null);
  effect(() => {
    const on = navigating.value;
    const h = sheetH.value;
    const r = open.value ? 0 : rawdahH.value;
    requestAnimationFrame(() => {
      const bar = document.querySelector<HTMLElement>('.nav-bar')?.offsetHeight ?? 64;
      const bottom = on ? `${h + bar + 24}px` : r ? `${r + 28}px` : '';
      for (const id of ['overlay', 'overlay-left']) document.getElementById(id)!.style.bottom = bottom;
    });
  });
  fac.onChange(() => engine.refreshStatus());
  addEventListener('resize', () => engine.refit());

  const watchNorth = (fn: (deg: number) => void) => {
    const on = () => fn(engine.north);
    engine.map.on('rotate', on);
    on();
    return () => engine.map.off('rotate', on);
  };

  // The weather in Madinah, every 30 minutes (none offline: the chip stays hidden).
  let weather: Weather | null = null;
  const weatherListeners = new Set<(w: Weather | null) => void>();
  const loadWeather = async () => {
    weather = (await currentWeather()) ?? weather;
    weatherListeners.forEach((f) => f(weather));
  };
  void loadWeather();
  setInterval(() => void loadWeather(), WEATHER_TTL_MS);

  function Tools() {
    const [base, setBase] = useState<BaseLayer>(engine.baseLayer);
    const [w, setW] = useState(weather);
    useEffect(() => {
      weatherListeners.add(setW);
      return () => void weatherListeners.delete(setW);
    }, []);
    return (
      <MapTools
        weather={<WeatherChip w={w} />}
        onStories={() => document.dispatchEvent(new CustomEvent('stories-request', { detail: 0 }))}
        onLibrary={() => document.dispatchEvent(new CustomEvent('library-request'))}
        onLocate={() => void trip.locate()}
        base={base}
        onBase={() => {
          const next = base === 'satellite' ? 'light' : 'satellite';
          engine.setBase(next);
          setBase(next);
        }}
      />
    );
  }

  // A shared link (map.html?poi=215) opens that place directly (shared links, printed signs). The
  // card opens it once mounted: an event sent before then would be lost.
  const linked = Number(new URLSearchParams(location.search).get('poi'));
  const shared = Number.isInteger(linked) ? POI_BY_ID.get(linked) : undefined;
  let initial = shared && !isHidden(shared) ? shared : undefined;
  // A shared story (?visit=543) or library entry (?lib=umar); ?admin=1 shows the status simulator.
  const params = new URLSearchParams(location.search);
  const visitAt = VISIT_LIST.findIndex((v) => v.poi.id === Number(params.get('visit')));
  let initialVisit = visitAt >= 0 ? visitAt : undefined;
  let initialLib = params.get('lib') ?? undefined;
  const admin = params.get('admin') === '1';

  const draw = () => {
    const lang = getLang();
    render(
      <LangContext.Provider value={lang}>
        <MapControls onZoom={(s) => engine.zoomBy(s)} onTurn={(d) => engine.turn(d)} onNorth={() => engine.resetNorth()} watchNorth={watchNorth} />
      </LangContext.Provider>,
      document.getElementById('overlay')!,
    );
    render(
      <LangContext.Provider value={lang}>
        <Tools />
      </LangContext.Provider>,
      document.getElementById('overlay-left')!,
    );
    render(<App key={lang} engine={engine} fac={fac} initial={initial} initialVisit={initialVisit} initialLib={initialLib} admin={admin} trip={trip} />, document.getElementById('ui')!);
    initial = initialVisit = initialLib = undefined;
  };
  draw();

  document.addEventListener('langchange', () => {
    document.title = t('title');
    engine.restyle();
    draw();
  });


  // For the browser tests and the performance script only (automated browsers), never for visitors.
  if (navigator.webdriver) Object.assign(window, { __engine: engine, __fac: fac, __trip: trip });
}

void main();
initPwa();
