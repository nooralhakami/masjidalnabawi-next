/*
 * map.html — the map with everything over it: search, categories, the place card (phase 4).
 * Routes and navigation come in phase 5, the Rawdah card, stories, library and languages in phase 6.
 */
import { computed, effect } from '@preact/signals';
import { render } from 'preact';
import { useState } from 'preact/hooks';
import '../styles/fonts';
import '../styles/main.css';
import { POI_BY_ID } from '../data';
import { Facilities } from '../domain/facilities';
import { isHidden } from '../domain/filters';
import { visiblePois } from '../domain/visible';
import { getLang, nm, t } from '../i18n';
import { applyLang, initialLang } from '../i18n/dom';
import { MapEngine, type BaseLayer } from '../map/engine';
import { filter, markersHidden, nav, parkingSub, query, searching, selected, sheetH, toiletSub } from '../state/store';
import { LangContext } from '../ui/i18n';
import { MapControls, MapTools } from '../ui/shell/MapControls';
import { applyTheme, savedTheme } from '../ui/theme';
import { App } from './App';
import { Trip } from './trip';

applyTheme(savedTheme(), false);
applyLang(initialLang());
document.title = t('title');

const root = document.getElementById('app')!;
root.innerHTML =
  '<div class="map-page"><div id="map" class="map-root" role="application"></div><div class="map-overlay" id="overlay"></div><div class="map-overlay-left" id="overlay-left"></div><div id="ui"></div></div>';

const fac = new Facilities();

async function main() {
  const engine = await MapEngine.create({
    container: document.getElementById('map')!,
    nameOf: (p) => nm(p),
    status: (id) => fac.status(id),
    onPick: (id) => document.dispatchEvent(new CustomEvent('map-tap', { detail: id })),
    routeText: { minutes: (m) => t('r_min', { t: m }), level: (l) => t('lvl_name', { l }), entrance: (p) => nm(p) },
    meLabel: () => t('you'),
  });

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
  // While navigating, the map's buttons rise above the sheet and the navigation bar (the live app's
  // body.is-navigating rule, written on the two button columns: no class on <body>).
  const navigating = computed(() => nav.value !== null);
  effect(() => {
    const on = navigating.value;
    const h = sheetH.value;
    requestAnimationFrame(() => {
      const bar = document.querySelector<HTMLElement>('.nav-bar')?.offsetHeight ?? 64;
      for (const id of ['overlay', 'overlay-left']) document.getElementById(id)!.style.bottom = on ? `${h + bar + 24}px` : '';
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

  function Tools() {
    const [base, setBase] = useState<BaseLayer>(engine.baseLayer);
    return (
      <MapTools
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
    render(<App key={lang} engine={engine} fac={fac} initial={initial} trip={trip} />, document.getElementById('ui')!);
    initial = undefined;
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
