<template>
  <div class="shell">
    <LauncherHeader
      :loading="loading"
      :update-count="updateCount"
      :updating-all="updatingAll"
      :sort-by="sortBy"
      :search="search"
      :grid-mode="gridMode"
      @refresh="load"
      @open-settings="openSettings"
      @update-all="updateAll"
      @update:sort-by="sortBy = $event"
      @update:search="search = $event"
      @update:grid-mode="gridMode = $event"
    />

    <main ref="contentRef" class="content">
      <div v-if="error" class="banner">
        <span>{{ error }}</span>
        <button @click="load">重试</button>
      </div>

      <div v-if="loading && !apps.length" class="empty">正在读取软件目录…</div>
      <div v-else-if="!visibleApps.length" class="empty">
        <p>{{ search ? '没有匹配的软件。' : '目录还是空的。' }}</p>
        <p class="hint">试试清空搜索，或到管理后台发布版本。</p>
      </div>

      <div v-else class="app-sections">
        <section v-for="group in appGroups" :key="group.key" class="app-section">
          <div class="app-section-head">
            <span class="hud">{{ group.label }}</span>
            <span class="app-section-count">{{ group.apps.length }}</span>
          </div>

          <div class="app-grid" :class="{ 'list-mode': !gridMode }">
            <AppCard
              v-for="app in group.apps"
              :key="app.appKey"
              :app="app"
              :grid-mode="gridMode"
              :busy="busy(app.appKey)"
              :updating-all="updatingAll"
              :supports-os="supportsOs(app)"
              :menu-open="menuKey === app.appKey"
              :progress="progress[app.appKey]"
              @open-detail="openDetail"
              @primary-action="primaryAction"
              @toggle-menu="toggleMenu"
              @launch="launch"
              @reveal="reveal"
              @install="install"
              @open-url="openUrl"
              @request-uninstall="requestUninstall"
            />
          </div>
        </section>
      </div>
    </main>

    <AppDetailPanel
      v-if="selected"
      :selected="selected"
      :meta="selectedMeta"
      :theme-vars="themeVars"
      :menu-open="menuKey === selected.appKey"
      :busy="busy(selected.appKey)"
      :supports-os="supportsOs(selected)"
      :host-os-version="hostOsVersion"
      :platform-label="platformLabel"
      @close="closeDetail"
      @prev="prevApp"
      @next="nextApp"
      @primary-action="primaryAction"
      @toggle-menu="toggleMenu"
      @launch="launch"
      @reveal="reveal"
      @install="install"
      @open-url="openUrl"
      @request-uninstall="requestUninstall"
    />

    <StatusBar
      :last-checked-label="lastCheckedLabel"
      :service-online="serviceOnline"
      @open-url="openUrl"
    />

    <SettingsModal
      :visible="settingsVisible"
      v-model:base-url="draftBaseUrl"
      v-model:refresh-minutes="refreshMinutes"
      :theme-mode="themeMode"
      :service-online="serviceOnline"
      :saving="saving"
      :loading="loading"
      :platform-label="platformLabel"
      :host-os-version="hostOsVersion"
      :arch="arch"
      :launcher-version="launcherVersion"
      @close="settingsVisible = false"
      @save="saveSettings"
      @reset="resetBaseUrl"
      @theme-mode="setThemeMode"
      @refresh-changed="saveRefreshInterval"
      @refresh-now="load"
      @open-url="openUrl"
    />

    <UninstallDialog
      v-model:delete-data="deleteUninstallData"
      :target="uninstallTarget"
      @close="uninstallTarget = null"
      @confirm="confirmUninstall"
    />

  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { appApi, type AppView, type Progress, type Settings } from './api';
import type { DetailMeta } from './lib/meta';
import { DETAIL_META } from './lib/detail-meta';
import AppCard from './components/AppCard.vue';
import LauncherHeader from './components/LauncherHeader.vue';
import SettingsModal from './components/SettingsModal.vue';
import StatusBar from './components/StatusBar.vue';
import UninstallDialog from './components/UninstallDialog.vue';
import { useTheme } from './composables/useTheme';
import { appColor, hexToRgba, shadeColor } from './lib/theme';
import { compareVersion } from './lib/version';


const apps = ref<AppView[]>([]);
const platform = ref('');
const arch = ref('');
const launcherVersion = '1.0.0';

function initialRefreshMinutes(): number {
  try {
    const value = Number(localStorage.getItem('vakaohub-refresh-minutes'));
    if (value === 0 || value === 15 || value === 30 || value === 60) return value;
  } catch {
    // localStorage 不可用时使用默认值。
  }
  return 30;
}

const hostOsVersion = ref('');
const contentRef = ref<HTMLElement | null>(null);
let initialScrollDone = false;
const { themeMode, setThemeMode, toggleTheme } = useTheme();
const refreshMinutes = ref<number>(initialRefreshMinutes());
const settings = ref<Settings>({ baseUrl: 'https://dist.woyuxiaji.cn/api/v1' });
const loading = ref(false);
const saving = ref(false);
const updatingAll = ref(false);
const error = ref('');
const busyKeys = ref<Record<string, boolean>>({});
const progress = ref<Record<string, Progress>>({});
const settingsVisible = ref(false);
const uninstallTarget = ref<AppView | null>(null);
const deleteUninstallData = ref(false);
const draftBaseUrl = ref('');
const search = ref('');
const sortBy = ref<'recent' | 'name' | 'status'>('recent');
const gridMode = ref(true);
const menuKey = ref('');
const selectedKey = ref('');
const serviceOnline = ref(true);
const lastCheckedAt = ref(0);
const now = ref(Date.now());

const updateCount = computed(() => apps.value.filter((app) => app.hasUpdate).length);

const lastCheckedLabel = computed(() => {
  if (!lastCheckedAt.value) return '尚未检查';
  const seconds = Math.max(0, Math.floor((now.value - lastCheckedAt.value) / 1000));
  if (seconds < 60) return '刚刚';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return new Date(lastCheckedAt.value).toLocaleDateString('zh-CN');
});
const platformLabel = computed(() => {
  const labels: Record<string, string> = {
    darwin: 'macOS',
    win32: 'Windows',
    android: 'Android',
    linux: 'Linux',
  };
  return labels[platform.value] ?? platform.value ?? 'DESKTOP';
});

const visibleApps = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  const list = apps.value.filter((app) => {
    if (!keyword) return true;
    return (
      app.name.toLowerCase().includes(keyword) ||
      app.appKey.toLowerCase().includes(keyword) ||
      (app.description ?? '').toLowerCase().includes(keyword)
    );
  });
  return list.sort((left, right) => {
    if (sortBy.value === 'name') return left.name.localeCompare(right.name, 'zh-CN');
    if (sortBy.value === 'status') {
      return Number(right.installed) - Number(left.installed) ||
        Number(right.hasUpdate) - Number(left.hasUpdate);
    }
    return right.latestVersionCode - left.latestVersionCode ||
      left.name.localeCompare(right.name, 'zh-CN');
  });
});

const appGroups = computed(() => {
  const installed = visibleApps.value.filter((app) => app.installed);
  const uninstalled = visibleApps.value.filter((app) => !app.installed);
  return [
    { key: 'installed', label: '已安装', apps: installed },
    { key: 'uninstalled', label: '未安装', apps: uninstalled },
  ].filter((group) => group.apps.length > 0);
});

const themeVars = computed<Record<string, string>>(() => {
  const app = selected.value;
  const theme = app ? appColor(app) : '#46A6C6';
  const deep = app ? shadeColor(theme, 0.3) : theme;
  return {
    '--theme': theme,
    '--theme-deep': deep,
    '--theme-soft': hexToRgba(theme, 0.26),
    '--theme-wash': hexToRgba(theme, 0.09),
    '--theme-scroll': hexToRgba(theme, 0.6),
  };
});

const selected = computed(() => apps.value.find((app) => app.appKey === selectedKey.value) ?? null);
const selectedMeta = computed<DetailMeta>(() => {
  if (!selected.value) {
    return { tagline: '', features: [], screenshots: [] };
  }
  return DETAIL_META[selected.value.appKey] ?? {
    tagline: selected.value.description || '暂无描述',
    features: [
      { title: '统一分发', description: '由 VaKao Hub 维护版本、产物与更新记录。' },
      { title: '完整性校验', description: '下载后校验 SHA-256，macOS 额外检查代码签名。' },
      { title: '持续更新', description: '启动器会检查新版本，并在本机完成安装。' },
    ],
    screenshots: [],
  };
});

let client: ReturnType<typeof appApi> | null = null;
let refreshTimer: number | undefined;
let clockTimer: number | undefined;

function api(): ReturnType<typeof appApi> {
  if (!client) client = appApi();
  return client;
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const current = await api();
    settings.value = await current.GetSettings();
    if (!settingsVisible.value) draftBaseUrl.value = settings.value.baseUrl;
    const catalog = await current.GetCatalog();
    apps.value = catalog.apps ?? [];
    platform.value = catalog.platform;
    arch.value = catalog.arch;
    hostOsVersion.value = catalog.osVersion ?? '';
    serviceOnline.value = true;
  } catch (cause) {
    error.value = (cause as Error).message;
    serviceOnline.value = false;
  } finally {
    loading.value = false;
    lastCheckedAt.value = Date.now();
    now.value = Date.now();
    (window as Window & { __vakaoHideSplash?: () => void }).__vakaoHideSplash?.();
    if (!initialScrollDone) {
      initialScrollDone = true;
      void nextTick(() => {
        contentRef.value?.scrollTo({ top: 0 });
        window.setTimeout(() => contentRef.value?.scrollTo({ top: 0 }), 80);
      });
    }
  }
}

async function install(app: AppView): Promise<void> {
  if (app.running) return;
  if (!supportsOs(app)) {
    error.value = `该版本需要 macOS ${app.minOs} 或更高版本，当前系统为 ${hostOsVersion.value}`;
    return;
  }
  menuKey.value = '';
  busyKeys.value = { ...busyKeys.value, [app.appKey]: true };
  error.value = '';
  try {
    await api().Install(app.appKey, app.artifactID);
    await load();
  } catch (cause) {
    error.value = (cause as Error).message;
  } finally {
    const next = { ...busyKeys.value };
    delete next[app.appKey];
    busyKeys.value = next;
  }
}

async function updateAll(): Promise<void> {
  if (updatingAll.value) return;
  updatingAll.value = true;
  const targets = apps.value.filter((app) => app.hasUpdate && !app.running);
  for (const app of targets) {
    await install(app);
  }
  updatingAll.value = false;
}

function supportsOs(app: AppView): boolean {
  if (!app.minOs || !hostOsVersion.value) return true;
  return compareVersion(hostOsVersion.value, app.minOs) >= 0;
}

async function primaryAction(app: AppView): Promise<void> {
  if (!supportsOs(app)) {
    error.value = `该版本需要 macOS ${app.minOs} 或更高版本，当前系统为 ${hostOsVersion.value}`;
    return;
  }
  if (app.running) return;
  if (!app.installed || app.hasUpdate) {
    await install(app);
  } else {
    await launch(app);
  }
}

function requestUninstall(app: AppView): void {
  if (app.running) return;
  menuKey.value = '';
  deleteUninstallData.value = false;
  uninstallTarget.value = app;
}

async function confirmUninstall(): Promise<void> {
  const app = uninstallTarget.value;
  uninstallTarget.value = null;
  if (!app) return;
  await uninstall(app, deleteUninstallData.value);
}

async function uninstall(app: AppView, deleteData: boolean): Promise<void> {
  if (app.running) return;
  menuKey.value = '';
  error.value = '';
  try {
    await api().Uninstall(app.appKey, deleteData);
    const next = { ...progress.value };
    delete next[app.appKey];
    progress.value = next;
    await load();
  } catch (cause) {
    error.value = (cause as Error).message;
  }
}

async function launch(app: AppView): Promise<void> {
  menuKey.value = '';
  error.value = '';
  try {
    await api().Launch(app.appKey);
  } catch (cause) {
    error.value = (cause as Error).message;
  }
}

function openDetail(app: AppView): void {
  menuKey.value = '';
  selectedKey.value = app.appKey;
}

function closeDetail(): void {
  selectedKey.value = '';
  menuKey.value = '';
}

function moveDetail(offset: number): void {
  if (!selected.value) return;
  const list = visibleApps.value;
  const index = list.findIndex((app) => app.appKey === selected.value?.appKey);
  if (index < 0) return;
  const next = (index + offset + list.length) % list.length;
  selectedKey.value = list[next].appKey;
}

function prevApp(): void {
  moveDetail(-1);
}

function nextApp(): void {
  moveDetail(1);
}

function toggleMenu(app: AppView): void {
  menuKey.value = menuKey.value === app.appKey ? '' : app.appKey;
}

function closeMenu(): void {
  menuKey.value = '';
}

function openSettings(): void {
  draftBaseUrl.value = settings.value.baseUrl;
  settingsVisible.value = true;
}

async function saveSettings(): Promise<void> {
  saving.value = true;
  error.value = '';
  try {
    settings.value = await api().SaveSettings(draftBaseUrl.value);
    settingsVisible.value = false;
    await load();
  } catch (cause) {
    error.value = (cause as Error).message;
  } finally {
    saving.value = false;
  }
}

function reveal(app: AppView): Promise<void> {
  menuKey.value = '';
  error.value = '';
  return api().Reveal(app.appKey).catch((cause: unknown) => {
    error.value = (cause as Error).message;
  });
}

function openUrl(url: string): void {
  menuKey.value = '';
  api().OpenURL(url);
}

function busy(appKey: string): boolean {
  return Boolean(busyKeys.value[appKey]);
}

function saveRefreshInterval(): void {
  try {
    localStorage.setItem('vakaohub-refresh-minutes', String(refreshMinutes.value));
  } catch {
    // localStorage 不可用时只保留本次会话的频率。
  }
  restartRefreshTimer();
}

function resetBaseUrl(): void {
  draftBaseUrl.value = 'https://dist.woyuxiaji.cn/api/v1';
}

function onKeydown(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key === ',') {
    event.preventDefault();
    openSettings();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'd') {
    event.preventDefault();
    toggleTheme();
    return;
  }
  if (event.key !== 'Escape') return;
  if (uninstallTarget.value) {
    uninstallTarget.value = null;
  } else if (settingsVisible.value) {
    settingsVisible.value = false;
  } else if (selectedKey.value) {
    closeDetail();
  }
}

function onProgress(payload: Progress): void {
  progress.value = { ...progress.value, [payload.appKey]: payload };
  if (payload.phase === 'error') {
    error.value = payload.message;
  }
}

function restartRefreshTimer(): void {
  if (refreshTimer) window.clearInterval(refreshTimer);
  refreshTimer = undefined;
  if (refreshMinutes.value <= 0) return;
  refreshTimer = window.setInterval(() => {
    if (!document.hidden && !loading.value) {
      void load();
    }
  }, refreshMinutes.value * 60 * 1000);
}

onMounted(() => {
  void load();
  window.addEventListener('click', closeMenu);
  window.addEventListener('keydown', onKeydown);
  const runtime = (window as unknown as {
    runtime?: {
      EventsOn(name: string, callback: (payload: Progress) => void): void;
      EventsOff(name: string): void;
    };
  }).runtime;
  runtime?.EventsOn('install:progress', onProgress);

  restartRefreshTimer();
  clockTimer = window.setInterval(() => {
    now.value = Date.now();
  }, 30 * 1000);
});

onUnmounted(() => {
  if (refreshTimer) window.clearInterval(refreshTimer);
  if (clockTimer) window.clearInterval(clockTimer);
  window.removeEventListener('click', closeMenu);
  window.removeEventListener('keydown', onKeydown);
  const runtime = (window as unknown as {
    runtime?: { EventsOff(name: string): void };
  }).runtime;
  runtime?.EventsOff('install:progress');
});
</script>
