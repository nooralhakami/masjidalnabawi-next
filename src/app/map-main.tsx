/*
 * map.html — phase 3: the map engine and its own buttons. The search, the categories and the sheet
 * come in phase 4, on top of this page.
 */
import { render } from 'preact';
import { useState } from 'preact/hooks';
import '../styles/fonts';
import '../styles/main.css';
import { POI_BY_ID } from '../data';
import { Facilities } from '../domain/facilities';
import { visiblePois } from '../domain/visible';
import { getLang, nm, t } from '../i18n';
import { applyLang, initialLang } from '../i18n/dom';
import { MapEngine, type BaseLayer } from '../map/engine';
import { LangContext } from '../ui/i18n';
import { MapControls, MapTools } from '../ui/shell/MapControls';

applyLang(initialLang());
document.title = t('title');

const app = document.getElementById('app')!;
app.innerHTML =
  '<div class="map-page"><div id="map" class="map-root" role="application"></div><div class="map-overlay" id="overlay"></div><div class="map-overlay-left" id="overlay-left"></div></div>';

const fac = new Facilities();

async function main() {
  const engine = await MapEngine.create({
    container: document.getElementById('map')!,
    nameOf: (p) => nm(p),
    status: (id) => fac.status(id),
    onPick: (id) => document.dispatchEvent(new CustomEvent('poi-pick', { detail: POI_BY_ID.get(id) })),
  });
  engine.setView({ ids: visiblePois('all', 'all', '', fac).map((p) => p.id), filter: 'all', withFeatured: true, hidden: false });
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
        base={base}
        onBase={() => {
          const next = base === 'satellite' ? 'light' : 'satellite';
          engine.setBase(next);
          setBase(next);
        }}
      />
    );
  }

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
  };
  draw();

  document.addEventListener('langchange', () => {
    document.title = t('title');
    engine.restyle();
    draw();
  });

  // For the browser tests and the performance script only (automated browsers), never for visitors.
  if (navigator.webdriver) Object.assign(window, { __engine: engine, __fac: fac });
}

void main();
