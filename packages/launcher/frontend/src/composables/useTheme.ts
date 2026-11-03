import { onMounted, onUnmounted, ref } from 'vue';

export type ThemeMode = 'system' | 'light' | 'dark';

function systemTheme(): 'light' | 'dark' {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function initialThemeMode(): ThemeMode {
  try {
    const savedMode = localStorage.getItem('vakaohub-theme-mode');
    if (savedMode === 'system' || savedMode === 'dark' || savedMode === 'light') {
      return savedMode;
    }
    const savedTheme = localStorage.getItem('vakaohub-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
  } catch {
    // localStorage 不可用时跟随系统。
  }
  return 'system';
}

export function useTheme() {
  const theme = ref<'light' | 'dark'>(
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  );
  const themeMode = ref<ThemeMode>(initialThemeMode());

  function applyNativeTheme(next: 'light' | 'dark'): void {
    const runtime = (window as Window & {
      runtime?: {
        WindowSetDarkTheme?: () => void;
        WindowSetLightTheme?: () => void;
      };
    }).runtime;
    if (next === 'dark') runtime?.WindowSetDarkTheme?.();
    else runtime?.WindowSetLightTheme?.();
  }

  function setTheme(next: 'light' | 'dark'): void {
    theme.value = next;
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    applyNativeTheme(next);
    try {
      localStorage.setItem('vakaohub-theme', next);
    } catch {
      // localStorage 不可用时只保留本次会话的主题。
    }
  }

  function setThemeMode(mode: ThemeMode): void {
    themeMode.value = mode;
    try {
      localStorage.setItem('vakaohub-theme-mode', mode);
    } catch {
      // localStorage 不可用时只保留本次会话的模式。
    }
    setTheme(mode === 'system' ? systemTheme() : mode);
  }

  function toggleTheme(): void {
    setThemeMode(theme.value === 'dark' ? 'light' : 'dark');
  }

  let media: MediaQueryList | undefined;
  function onSystemThemeChange(): void {
    if (themeMode.value === 'system') setTheme(systemTheme());
  }

  onMounted(() => {
    const mode = initialThemeMode();
    themeMode.value = mode;
    setTheme(mode === 'system' ? systemTheme() : mode);
    media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', onSystemThemeChange);
  });

  onUnmounted(() => {
    media?.removeEventListener('change', onSystemThemeChange);
  });

  return { theme, themeMode, setThemeMode, toggleTheme };
}
