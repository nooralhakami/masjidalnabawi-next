import type { ComponentChildren, Ref } from 'preact';
import type { JSX } from 'preact';
import { Icon } from '../kit/Icon';
import { IconButton } from '../kit/Button';
import { tNext } from '../../i18n-next/strings';
import { useI18n } from '../i18n';

/**
 * The floating search bar at the top of the map: the search field (with clear) and the app's own
 * buttons — the theme, sun mode (high contrast, owner 2026-10-16), sharing the app, and the language.
 * Room under it for the panel.
 */
export function SearchBar({
  value,
  onInput,
  onClear,
  langShort,
  onLang,
  dark,
  onTheme,
  contrast = false,
  onContrast,
  onShare,
  expanded = false,
  inputRef,
  inputProps,
  children,
}: {
  value: string;
  onInput(v: string): void;
  onClear(): void;
  /** The language button shows only once the language menu exists (phase 6). */
  langShort?: string;
  onLang?(): void;
  dark: boolean;
  onTheme(): void;
  /** Sun mode: stronger text and lines for bright sunlight. */
  contrast?: boolean;
  onContrast?(): void;
  onShare?(): void;
  expanded?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  /** Keyboard, focus and ARIA wiring from the search panel. */
  inputProps?: Omit<JSX.HTMLAttributes<HTMLInputElement>, 'value' | 'onInput'>;
  children?: ComponentChildren;
}) {
  const { t } = useI18n();
  return (
    <div class="search" role="search">
      <div class="search-bar">
        <label class="search-field">
          <Icon name="search" />
          <span class="sr-only">{t('ph')}</span>
          <input
            ref={inputRef}
            type="search"
            autocomplete="off"
            enterkeyhint="search"
            role="combobox"
            aria-expanded={expanded}
            aria-autocomplete="list"
            aria-label={t('ph')}
            placeholder={t('ph')}
            {...inputProps}
            value={value}
            onInput={(e) => onInput(e.currentTarget.value)}
          />
          {value ? <IconButton icon="close" label={t('clear')} class="search-clear" onClick={onClear} /> : null}
        </label>
        {langShort && onLang ? (
          <button type="button" class="lang-btn" id="lang-btn" aria-haspopup="true" aria-controls="lang-menu" aria-label={t('lang_title')} title={t('lang_title')} onClick={onLang}>
            <Icon name="globe" size={18} />
            <span>{langShort}</span>
          </button>
        ) : null}
        <IconButton icon={dark ? 'sun' : 'moon'} label={t(dark ? 'theme_day' : 'theme_night')} pressed={dark} class="theme-btn" onClick={onTheme} />
        {onContrast ? (
          <button type="button" class="icon-btn contrast-btn" aria-label={tNext('contrast_more')} title={tNext('contrast_more')} aria-pressed={contrast} onClick={onContrast}>
            {/* The usual contrast sign: a circle half filled. */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true" focusable="false">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none" />
            </svg>
          </button>
        ) : null}
        {onShare ? <IconButton icon="share" label={t('share_app')} onClick={onShare} /> : null}
      </div>
      {children}
    </div>
  );
}

/** The panel under the search bar: a heading, then results, or loading rows, or «no results». */
export function SearchPanel({ state, id, head, children }: { state: 'results' | 'loading' | 'empty' | 'recent'; id?: string; head?: ComponentChildren; children?: ComponentChildren }) {
  const { t } = useI18n();
  return (
    <div class="search-panel" id={id} role="listbox" aria-busy={state === 'loading' ? true : undefined}>
      {state === 'empty' ? (
        <div class="search-empty" role="status">
          <Icon name="search" size={22} />
          <span>{t('nores2')}</span>
        </div>
      ) : (
        <>
          <div class="search-head">{head ?? t('results')}</div>
          {children}
        </>
      )}
    </div>
  );
}
