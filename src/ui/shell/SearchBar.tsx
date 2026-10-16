import type { ComponentChildren } from 'preact';
import { Icon } from '../kit/Icon';
import { IconButton } from '../kit/Button';
import { useI18n } from '../i18n';

/**
 * The floating search bar at the top of the map: search field (with clear), the language and theme
 * buttons, and room under it for the search panel. Behaviour (debounce, keyboard, results) comes in
 * phase 4; this is its look in every state.
 */
export function SearchBar({
  value,
  onInput,
  onClear,
  langShort,
  onLang,
  dark,
  onTheme,
  expanded = false,
  children,
}: {
  value: string;
  onInput(v: string): void;
  onClear(): void;
  langShort: string;
  onLang(): void;
  dark: boolean;
  onTheme(): void;
  expanded?: boolean;
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
            type="search"
            autocomplete="off"
            enterkeyhint="search"
            role="combobox"
            aria-expanded={expanded}
            aria-autocomplete="list"
            placeholder={t('ph')}
            value={value}
            onInput={(e) => onInput(e.currentTarget.value)}
          />
          {value ? <IconButton icon="close" label={t('clear')} class="search-clear" onClick={onClear} /> : null}
        </label>
        <button type="button" class="lang-btn" aria-haspopup="true" aria-label={t('lang_title')} title={t('lang_title')} onClick={onLang}>
          <Icon name="globe" size={18} />
          <span>{langShort}</span>
        </button>
        <IconButton icon={dark ? 'sun' : 'moon'} label={t(dark ? 'theme_day' : 'theme_night')} pressed={dark} onClick={onTheme} />
      </div>
      {children}
    </div>
  );
}

/** The panel under the search bar: a heading, then results, or loading rows, or «no results». */
export function SearchPanel({ state, children }: { state: 'results' | 'loading' | 'empty'; children?: ComponentChildren }) {
  const { t } = useI18n();
  return (
    <div class="search-panel" role="listbox" aria-busy={state === 'loading' ? 'true' : undefined}>
      {state === 'empty' ? (
        <div class="search-empty" role="status">
          <Icon name="search" size={22} />
          <span>{t('nores2')}</span>
        </div>
      ) : (
        <>
          <div class="search-head">{t('results')}</div>
          {children}
        </>
      )}
    </div>
  );
}
