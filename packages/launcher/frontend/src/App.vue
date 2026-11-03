<template>
  <div class="shell">
    <aside class="rail">
      <div class="rail-brand">
        <img :src="starUrl" class="rail-star" alt="" />
        <div>
          <strong>VaKao Hub</strong>
          <span>软件中心</span>
        </div>
      </div>

      <nav class="rail-nav" aria-label="视图">
        <button :class="{ active: filter === 'all' }" @click="filter = 'all'">
          <span>全部软件</span><b>{{ apps.length }}</b>
        </button>
        <button :class="{ active: filter === 'updates' }" @click="filter = 'updates'">
          <span>可更新</span><b>{{ updateCount }}</b>
        </button>
        <button :class="{ active: filter === 'installed' }" @click="filter = 'installed'">
          <span>已安装</span><b>{{ installedCount }}</b>
        </button>
      </nav>

      <div class="rail-note">
        <span class="hud">DELIVERY</span>
        <p>统一版本、灰度与校验。<br />所有软件，一个入口。</p>
      </div>

      <div class="rail-foot">
        <div class="service">
          <i :class="{ off: !serviceOnline }"></i>
          <span>{{ serviceOnline ? '分发服务在线' : '服务不可达' }}</span>
        </div>
        <button class="rail-link" @click="openSettings">设置 <span>↗</span></button>
      </div>
    </aside>

    <main class="main">
      <header class="masthead">
        <div>
          <p class="hud">WORKBENCH / {{ platformLabel }}</p>
          <h1>{{ filterTitle }}</h1>
        </div>
        <div class="mast-actions">
          <label class="search">
            <span aria-hidden="true">⌕</span>
            <input v-model="search" type="search" placeholder="搜索应用" autocomplete="off" />
          </label>
          <button class="icon-btn" :disabled="loading" title="刷新" @click="load">↻</button>
        </div>
      </header>

      <div v-if="error" class="banner">
        <span>{{ error }}</span>
        <button @click="load">重试</button>
      </div>

      <section class="metrics" aria-label="概览">
        <div>
          <span class="hud">INSTALLED</span>
          <strong>{{ installedCount }}</strong>
          <span>已安装</span>
        </div>
        <div>
          <span class="hud">UPDATES</span>
          <strong>{{ updateCount }}</strong>
          <span>可更新</span>
        </div>
        <div>
          <span class="hud">CATALOG</span>
          <strong>{{ apps.length }}</strong>
          <span>应用总数</span>
        </div>
      </section>

      <section class="list">
        <div v-if="loading && !apps.length" class="empty">正在读取软件目录…</div>
        <div v-else-if="!filteredApps.length" class="empty">
          <p>{{ search ? '没有匹配的软件。' : '这个视图里还没有软件。' }}</p>
          <p class="hint">试试切换左侧筛选，或到管理后台发布版本。</p>
        </div>

        <article
          v-for="app in filteredApps"
          :key="app.appKey"
          class="app-row"
          :style="{ '--app-color': colorFor(app.appKey) }"
        >
          <span class="accent" aria-hidden="true"></span>

          <div class="app-icon" :style="{ background: colorFor(app.appKey) }">
            <img v-if="app.iconUrl" :src="app.iconUrl" :alt="app.name" />
            <span v-else>{{ initial(app.name) }}</span>
          </div>

          <div class="app-body">
            <div class="app-head">
              <h2>{{ app.name }}</h2>
              <span v-if="app.running" class="pill running">当前运行</span>
              <span v-else-if="app.hasUpdate" class="pill update">可更新</span>
              <span v-else-if="app.installed" class="pill installed">已安装</span>
              <span v-if="mustUpdate(app)" class="pill force">必须更新</span>
            </div>

            <p class="desc">{{ app.description || '暂无描述' }}</p>

            <div class="meta">
              <span><em>最新</em>{{ app.latestVersion }}</span>
              <span v-if="app.installed">
                <em>{{ app.running ? '当前' : '已安装' }}</em>{{ app.installedVersion }}
              </span>
              <span>
                <em>产物</em>{{ app.artifactFormat.toUpperCase() }} · {{ formatBytes(app.artifactSize) }}
              </span>
            </div>

            <div v-if="progress[app.appKey] && busy(app.appKey)" class="progress">
              <div class="bar">
                <span :style="{ width: percentOf(app.appKey) }"></span>
              </div>
              <p class="hint">
                {{ progress[app.appKey].message }}
                <span v-if="progress[app.appKey].percent >= 0">
                  {{ progress[app.appKey].percent }}%
                </span>
              </p>
            </div>

            <p v-if="app.duplicates?.length" class="notice">
              检测到 {{ app.duplicates.length + 1 }} 份安装：{{ (app.duplicates ?? []).join('、') }}。请只保留一份。
            </p>
            <p v-if="app.running && app.hasUpdate" class="notice">
              有新版本，请手动下载替换当前启动器。
            </p>
            <p v-if="mustUpdate(app)" class="notice">
              该版本要求强制更新，更新到 {{ app.latestVersion }} 后才能打开。
            </p>
          </div>

          <div class="app-actions">
            <template v-if="app.running">
              <span class="running-note">正在使用</span>
              <button v-if="app.homepage" class="btn ghost" @click="openUrl(app.homepage)">
                主页
              </button>
            </template>
            <template v-else>
              <button
                v-if="!app.installed"
                class="btn"
                :disabled="busy(app.appKey)"
                @click="install(app)"
              >
                安装
              </button>
              <template v-else>
                <button
                  v-if="app.hasUpdate"
                  class="btn"
                  :disabled="busy(app.appKey)"
                  @click="install(app)"
                >
                  更新
                </button>
                <button
                  class="btn"
                  :class="{ secondary: app.hasUpdate }"
                  :disabled="busy(app.appKey) || mustUpdate(app)"
                  :title="mustUpdate(app) ? '请先更新到最新版本' : ''"
                  @click="launch(app)"
                >
                  打开
                </button>
                <button class="btn ghost danger" @click="uninstall(app)">卸载</button>
              </template>
              <button v-if="app.homepage" class="btn ghost" @click="openUrl(app.homepage)">
                主页
              </button>
            </template>
          </div>
        </article>
      </section>

      <footer class="statusbar">
        <span>{{ settings.baseUrl }}</span>
        <span v-if="platform">PLATFORM / {{ platform }} / {{ arch }}</span>
      </footer>
    </main>

    <div v-if="settingsVisible" class="overlay" @click.self="settingsVisible = false">
      <aside class="drawer">
        <div class="drawer-head">
          <p class="hud">SETTINGS</p>
          <button class="icon-btn" @click="settingsVisible = false">×</button>
        </div>
        <h2>分发服务</h2>
        <p class="hint">
          本地开发使用 <code>http://127.0.0.1:3000/api/v1</code>；正式版本默认连接生产服务。
        </p>
        <label class="field">
          <span class="hud">BASE URL</span>
          <input v-model="draftBaseUrl" spellcheck="false" placeholder="https://dist.woyuxiaji.cn/api/v1" />
        </label>
        <div class="drawer-actions">
          <button class="btn ghost" @click="settingsVisible = false">取消</button>
          <button class="btn" :disabled="saving" @click="saveSettings">保存</button>
        </div>
        <div class="drawer-foot">
          <span class="hud">ABOUT</span>
          <p>VaKao Hub · 软件中心<br />统一安装、更新与校验。</p>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
  appApi,
  type AppView,
  type Progress,
  type Settings,
} from './api';
import starUrl from './assets/star.png';

const apps = ref<AppView[]>([]);
const platform = ref('');
const arch = ref('');
const settings = ref<Settings>({ baseUrl: 'https://dist.woyuxiaji.cn/api/v1' });
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const busyKeys = ref<Record<string, boolean>>({});
const progress = ref<Record<string, Progress>>({});
const settingsVisible = ref(false);
const draftBaseUrl = ref('');
const filter = ref<'all' | 'updates' | 'installed'>('all');
const search = ref('');
const serviceOnline = ref(true);

const installedCount = computed(
  () => apps.value.filter((app) => app.installed).length,
);
const updateCount = computed(
  () => apps.value.filter((app) => app.hasUpdate).length,
);
const platformLabel = computed(() => {
  const labels: Record<string, string> = {
    darwin: 'macOS',
    win32: 'Windows',
    android: 'Android',
    linux: 'Linux',
  };
  return labels[platform.value] ?? platform.value ?? 'DESKTOP';
});
const filterTitle = computed(() => {
  if (filter.value === 'updates') return '可更新';
  if (filter.value === 'installed') return '已安装';
  return '软件目录';
});
const filteredApps = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  return apps.value.filter((app) => {
    if (filter.value === 'updates' && !app.hasUpdate) return false;
    if (filter.value === 'installed' && !app.installed) return false;
    if (!keyword) return true;
    return (
      app.name.toLowerCase().includes(keyword) ||
      app.appKey.toLowerCase().includes(keyword) ||
      (app.description ?? '').toLowerCase().includes(keyword)
    );
  });
});

let client: ReturnType<typeof appApi> | null = null;
let refreshTimer: number | undefined;

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
    draftBaseUrl.value = settings.value.baseUrl;
    const catalog = await current.GetCatalog();
    apps.value = catalog.apps ?? [];
    platform.value = catalog.platform;
    arch.value = catalog.arch;
    serviceOnline.value = true;
  } catch (cause) {
    error.value = (cause as Error).message;
    serviceOnline.value = false;
  } finally {
    loading.value = false;
  }
}

async function install(app: AppView): Promise<void> {
  if (app.running) return;
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

async function uninstall(app: AppView): Promise<void> {
  if (app.running) return;
  if (!window.confirm(`确定卸载 ${app.name}？安装目录会被删除。`)) return;
  error.value = '';
  try {
    await api().Uninstall(app.appKey);
    const next = { ...progress.value };
    delete next[app.appKey];
    progress.value = next;
    await load();
  } catch (cause) {
    error.value = (cause as Error).message;
  }
}

async function launch(app: AppView): Promise<void> {
  error.value = '';
  try {
    await api().Launch(app.appKey);
  } catch (cause) {
    error.value = (cause as Error).message;
  }
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

function openUrl(url: string): void {
  api().OpenURL(url);
}

function busy(appKey: string): boolean {
  return Boolean(busyKeys.value[appKey]);
}

function mustUpdate(app: AppView): boolean {
  return !app.running && app.installed && app.hasUpdate && app.forceUpdate;
}

function percentOf(appKey: string): string {
  const item = progress.value[appKey];
  if (!item || item.percent < 0) return '0%';
  return `${Math.min(100, item.percent)}%`;
}

function initial(name: string): string {
  return (name || '?').trim().charAt(0).toUpperCase();
}

function formatBytes(bytes: number): string {
  if (!bytes) return '未知大小';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`;
}

const palette = ['#5fbedc', '#f0995f', '#a27fc2', '#eddf55'];

function colorFor(key: string): string {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

function onProgress(payload: Progress): void {
  progress.value = { ...progress.value, [payload.appKey]: payload };
  if (payload.phase === 'error') {
    error.value = payload.message;
  }
}

onMounted(() => {
  void load();
  const runtime = (window as unknown as {
    runtime?: {
      EventsOn(name: string, callback: (payload: Progress) => void): void;
      EventsOff(name: string): void;
    };
  }).runtime;
  runtime?.EventsOn('install:progress', onProgress);

  refreshTimer = window.setInterval(() => {
    if (!document.hidden && !loading.value) {
      void load();
    }
  }, 30 * 60 * 1000);
});

onUnmounted(() => {
  if (refreshTimer) window.clearInterval(refreshTimer);
  const runtime = (window as unknown as {
    runtime?: { EventsOff(name: string): void };
  }).runtime;
  runtime?.EventsOff('install:progress');
});
</script>
