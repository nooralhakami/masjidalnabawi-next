import type { ComponentChildren, Ref } from 'preact';
import type { JSX } from 'preact';
import { Icon } from '../kit/Icon';
import { IconButton } from '../kit/Button';
import { useI18n } from '../i18n';

/**
 * The floating search bar at the top of the map: the search field (with clear) and the app's own
 * buttons — the theme, sharing the app, and (phase 6) the language. Room under it for the panel.
 */
export function SearchBar({
  value,
  onInput,
  onClear,
  langShort,
  onLang,
  dark,
  onTheme,
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
