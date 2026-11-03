import { computed, ref } from 'vue';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'hub_theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');
const systemDark = ref(media.matches);
const preference = ref<ThemePreference>(readPreference());

media.addEventListener('change', (event) => {
  systemDark.value = event.matches;
});

/** 用户选过就固定，否则跟随系统（由 tokens.css 的 media query 兜底）。 */
export const isDark = computed(() =>
  preference.value === 'system' ? systemDark.value : preference.value === 'dark',
);

function readPreference(): ThemePreference {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'light' || saved === 'dark' ? saved : 'system';
}

function applyDom(value: ThemePreference): void {
  const root = document.documentElement;
  if (value === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', value);
}

applyDom(preference.value);

export function useTheme() {
  function toggleTheme(): void {
    const next: ThemePreference = isDark.value ? 'light' : 'dark';
    preference.value = next;
    localStorage.setItem(STORAGE_KEY, next);
    applyDom(next);
  }

  return { isDark, preference, toggleTheme };
}
