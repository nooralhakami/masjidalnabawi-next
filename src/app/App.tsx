import { useComputed, useSignal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { POI_BY_ID } from '../data';
import type { Poi } from '../data/types';
import type { Facilities } from '../domain/facilities';
import { FILTERS, type FilterId, type ParkingSub, type ToiletSub } from '../domain/filters';
import { visiblePois } from '../domain/visible';
import { getLang, nm, t } from '../i18n';
import type { MapEngine } from '../map/engine';
import { filter, level, markersHidden, notify, parkingSub, query, selected, sheet, toast, toiletSub, travel, typed } from '../state/store';
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
}

/** Everything over the map on map.html (phase 4): search, categories, the place card, notices. */
export function App({ engine, fac, initial }: AppProps) {
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
  const select = (p: Poi, fly: boolean) => {
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
    selected.value = null;
    sheet.value = 'closed';
    if (typed.value.trim()) {
      typed.value = '';
      query.value = '';
    }
  };

  useEffect(() => {
    const onPick = (e: Event) => {
      const id = (e as CustomEvent<number | null>).detail;
      const p = id !== null ? POI_BY_ID.get(id) : undefined;
      if (p) select(p, false);
      else if (selected.value !== null) deselect();
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
      >
        {place ? (
          <PlaceCard
            p={place}
            fac={fac}
            travel={travel.value}
            level={level.value}
            onTravel={(v) => (travel.value = v)}
            onLevel={(v) => (level.value = v)}
            // The route itself comes in phase 5 (routing/plan.ts is ready, the drawing is not).
            onRoute={() => undefined}
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
      <div class="toast-host" style={{ '--sheet-h': `${place ? detentHeights(innerHeight, { extra: extraFor(travel.value) })[sheet.value] : 0}px` }}>
        {toast.value ? (
          <Toast key={toast.value.id} tone={toast.value.tone} icon={toast.value.tone === 'ok' ? 'check' : 'info'}>
            {toast.value.text}
          </Toast>
        ) : null}
      </div>
    </LangContext.Provider>
  );
}
