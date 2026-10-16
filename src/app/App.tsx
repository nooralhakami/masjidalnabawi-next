import { useComputed, useSignal } from '@preact/signals';
import { useEffect, useRef, useState } from 'preact/hooks';
import { POI_BY_ID } from '../data';
import type { Poi } from '../data/types';
import type { Facilities } from '../domain/facilities';
import { FILTERS, type FilterId, type ParkingSub, type ToiletSub } from '../domain/filters';
import { visiblePois } from '../domain/visible';
import { getLang, nm, t } from '../i18n';
import type { MapEngine } from '../map/engine';
import { isClosed } from '../domain/facilities';
import { filter, garageQ, level, markersHidden, nav, notify, parkingSub, query, route, selected, sheet, sheetH, toast, toiletSub, travel, typed } from '../state/store';
import { GarageAsk } from '../ui/route/GarageAsk';
import { NavBar } from '../ui/route/NavBar';
import { RouteCard } from '../ui/route/RouteCard';
import type { Trip } from './trip';
import { LangContext } from '../ui/i18n';
import { Toast } from '../ui/kit/Toast';
import { SearchArea } from '../ui/search/SearchArea';
import { BottomSheet } from '../ui/sheet/BottomSheet';
import { PlaceCard } from '../ui/sheet/PlaceCard';
import { detentHeights } from '../ui/sheet/physics';
import { CategoryRow } from '../ui/shell/CategoryRow';
import { applyTheme, currentTheme } from '../ui/theme';

/** Extra height of the half-open card for its walking/car row, and the level row by car (as the live app). */
const extraFor = (tr: 'walk' | 'drive') => (tr === 'drive' ? 120 : 64);

export interface AppProps {
  engine: MapEngine;
  fac: Facilities;
  /** A place to open as soon as the card is ready (a shared ?poi= link). */
  initial?: Poi;
  /** Routes and live navigation (phase 5). */
  trip: Trip;
}

/** Everything over the map on map.html (phase 4): search, categories, the place card, notices. */
export function App({ engine, fac, initial, trip }: AppProps) {
  const lang = getLang();
  const dark = useSignal(currentTheme() === 'dark');
  const top = useRef<HTMLDivElement>(null);

  // How many places each pill shows (the live app's counts), and what the chosen pill shows now.
  const counts = useComputed(() => {
    const c = Object.fromEntries(FILTERS.map(({ id }) => [id, visiblePois(id, 'all', '', fac, undefined, id === 'parking' ? 'all' : undefined).length])) as Record<FilterId, number>;
    c[filter.value] = visiblePois(filter.value, toiletSub.value, '', fac, undefined, parkingSub.value).length;
    return c;
  });

  const rank = (q: string) => visiblePois(filter.value, toiletSub.value, q, fac, undefined, parkingSub.value);

  /** Open a place's card: the map flies to it when it was chosen from a list or a link (the live app's select()). */
  const [routing, setRouting] = useState(false);
  // A facility opened or closed (works, maintenance): the card shows it at once (the live app's fac.onChange).
  const [, setFacTick] = useState(0);
  useEffect(() => fac.onChange(() => setFacTick((n) => n + 1)), [fac]);

  const select = (p: Poi, fly: boolean) => {
    // A new destination ends the current walk entirely (GPS watch, wake lock, the bar).
    if (selected.value !== p.id) trip.end();
    const wasClosed = sheet.value === 'closed';
    selected.value = p.id;
    if (sheet.value !== 'full') sheet.value = 'half';
    const topH = top.current?.getBoundingClientRect().bottom ?? 0;
    const sheetH = detentHeights(innerHeight, { extra: extraFor(travel.value) })[sheet.value === 'full' ? 'half' : sheet.value];
    engine.focus(p.id, { legacyZoom: fly ? Math.max(Math.round(engine.legacyZoom), 19) : undefined, fly, top: topH + 8, bottom: sheetH });
    if (wasClosed) requestAnimationFrame(() => (document.querySelector('.pc-title') as HTMLElement | null)?.focus({ preventScroll: true }));
  };

  /** Close the card. Closing it ends the search too (owner, 2026-10-14): every place comes back. */
  const deselect = () => {
    trip.end();
    selected.value = null;
    sheet.value = 'closed';
    if (typed.value.trim()) {
      typed.value = '';
      query.value = '';
    }
  };

  /** «Route from my location»: the button shows it is busy while the location is asked and the way planned. */
  const runRoute = async (p: Poi) => {
    setRouting(true);
    try {
      await trip.draw(p);
    } finally {
      setRouting(false);
    }
  };

  useEffect(() => {
    const onPick = (e: Event) => {
      const id = (e as CustomEvent<number | null>).detail;
      const p = id !== null ? POI_BY_ID.get(id) : undefined;
      if (p) select(p, false);
      // While a route is followed, a stray tap on the map must not end it (use «إنهاء المسار»).
      else if (selected.value !== null && !trip.active) deselect();
    };
    const onOpen = (e: Event) => select((e as CustomEvent<Poi>).detail, true);
    document.addEventListener('map-tap', onPick);
    document.addEventListener('open-place', onOpen);
    if (initial) select(initial, true);
    return () => {
      document.removeEventListener('map-tap', onPick);
      document.removeEventListener('open-place', onOpen);
    };
  }, []);

  const share = async (url: string, title: string, copied: string) => {
    try {
      if (navigator.share) await navigator.share({ title, text: title === t('title') ? title : `${title} — ${t('title')}`, url });
      else {
        await navigator.clipboard.writeText(url);
        notify(copied, 'ok');
      }
    } catch {
      // The visitor closed the share sheet, or the clipboard is blocked.
    }
  };

  const place = selected.value !== null ? POI_BY_ID.get(selected.value) : undefined;
  const pickFilter = (f: FilterId) => {
    filter.value = f;
    if (f !== 'toilets') toiletSub.value = 'all';
    if (f !== 'parking') parkingSub.value = 'all';
    markersHidden.value = false;
    requestAnimationFrame(() => document.querySelector('.cat-btn[aria-pressed="true"]')?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' }));
  };

  return (
    <LangContext.Provider value={lang}>
      <div class="app-top" ref={top}>
        <SearchArea
          rank={rank}
          status={(id) => fac.status(id)}
          onPick={(p) => select(p, true)}
          dark={dark.value}
          onTheme={() => {
            const next = currentTheme() === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            dark.value = next === 'dark';
            engine.restyle();
          }}
          onShare={() => void share(new URL('./', location.href).href, t('title'), t('app_link_copied'))}
        />
        <CategoryRow
          filter={filter.value}
          counts={counts.value}
          onFilter={pickFilter}
          hidden={markersHidden.value}
          onHidden={(h) => (markersHidden.value = h)}
          toiletSub={toiletSub.value}
          parkingSub={parkingSub.value}
          onSub={(s) => {
            if (filter.value === 'parking') parkingSub.value = s as ParkingSub;
            else toiletSub.value = s as ToiletSub;
            markersHidden.value = false;
          }}
        />
      </div>
      <BottomSheet
        detent={place ? sheet.value : 'closed'}
        onDetent={(d) => (d === 'closed' ? deselect() : (sheet.value = d))}
        label={place ? nm(place) : t('sheet_label')}
        extra={extraFor(travel.value)}
        fit={!!route.value}
        onHeight={(h) => (sheetH.value = h)}
      >
        {place && route.value ? (
          <RouteCard
            p={place}
            r={route.value}
            closed={isClosed(fac.status(place.id))}
            onClose={deselect}
            onEnd={() => trip.end()}
            onWayOut={() => void trip.wayOut()}
            onWayIn={() => void runRoute(place)}
          />
        ) : place ? (
          <PlaceCard
            p={place}
            fac={fac}
            travel={travel.value}
            level={level.value}
            onTravel={(v) => (travel.value = v)}
            onLevel={(v) => (level.value = v)}
            onRoute={() => void runRoute(place)}
            routing={routing}
            onShare={() => {
              const url = new URL('./map.html', location.href);
              url.search = '';
              url.searchParams.set('poi', String(place.id));
              void share(url.href, nm(place), t('place_link_copied'));
            }}
            onClose={deselect}
            onGo={(p) => select(p, true)}
          />
        ) : null}
      </BottomSheet>
      {nav.value || garageQ.value ? (
        // The car park question is a modal over the card, from the bottom of the screen (it is too
        // tall to sit above a half-open card on a short phone); the navigation bar sits above the sheet.
        <div class={`nav-host${garageQ.value ? ' is-modal' : ''}`} style={{ '--sheet-h': `${place && !garageQ.value ? sheetH.value : 0}px` }}>
          {garageQ.value ? (
            <GarageAsk key={garageQ.value.lots.map((l) => l.id).join()} lots={garageQ.value.lots} onAnswer={garageQ.value.answer} />
          ) : nav.value ? (
            <NavBar s={nav.value} level={route.value?.drive?.level} onFollow={() => trip.tracker.toggleFollow()} onEnd={() => trip.end()} onKeep={() => trip.tracker.keepGoing()} />
          ) : null}
        </div>
      ) : null}
      <div class="toast-host" style={{ '--sheet-h': `${place ? sheetH.value : 0}px` }}>
        {toast.value ? (
          <Toast key={toast.value.id} tone={toast.value.tone} icon={toast.value.tone === 'ok' ? 'check' : 'info'}>
            {toast.value.text}
          </Toast>
        ) : null}
      </div>
    </LangContext.Provider>
  );
}
