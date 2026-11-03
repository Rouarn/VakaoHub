<template>
  <div class="shell">
    <header class="topbar">
      <div class="brand">
        <span class="mark" aria-hidden="true">
          <i class="blue" /><i class="orange" /><i class="purple" /><i class="yellow" />
        </span>
        <div>
          <h1>VaKao Hub</h1>
          <p>软件中心</p>
        </div>
      </div>
      <div class="top-actions">
        <span v-if="updatesAvailable" class="badge update">
          {{ updatesAvailable }} 个更新
        </span>
        <button class="ghost" :disabled="loading" @click="load">刷新</button>
        <button class="ghost" @click="openSettings">设置</button>
      </div>
    </header>

    <main>
      <div v-if="error" class="banner">
        <span>{{ error }}</span>
        <button class="link" @click="load">重试</button>
      </div>

      <div v-if="loading && !apps.length" class="empty">正在读取应用目录…</div>
      <div v-else-if="!apps.length" class="empty">
        <p>目录还是空的。</p>
        <p class="hint">先在管理后台创建应用并上传产物，再回到这里刷新。</p>
      </div>

      <section v-else class="grid">
        <article v-for="app in apps" :key="app.appKey" class="card">
          <div class="card-head">
            <div class="icon" :style="{ background: colorFor(app.appKey) }">
              <img v-if="app.iconUrl" :src="app.iconUrl" :alt="app.name" />
              <span v-else>{{ initial(app.name) }}</span>
            </div>
            <div class="title">
              <h2>{{ app.name }}</h2>
              <p class="meta">
                {{ app.category || '应用' }} · {{ app.artifactFormat.toUpperCase() }}
              </p>
            </div>
            <span v-if="app.running" class="badge ok">当前运行</span>
            <span v-else-if="app.hasUpdate" class="badge update">可更新</span>
            <span v-else-if="app.installed" class="badge ok">已安装</span>
          </div>

          <p class="desc">{{ app.description || '暂无描述' }}</p>

          <div class="versions">
            <span>最新 {{ app.latestVersion }}</span>
            <span v-if="app.installed">
              {{ app.running ? '当前' : '已安装' }} {{ app.installedVersion }}
            </span>
            <span v-if="mustUpdate(app)" class="warn">必须更新</span>
          </div>

          <p v-if="app.duplicates?.length" class="hint warn">
            检测到多份安装：{{ (app.duplicates ?? []).join('、') }}，请只保留一份。
          </p>
          <p v-if="app.running && app.hasUpdate" class="hint warn">
            有新版本，请手动下载替换当前启动器。
          </p>

          <div v-if="progress[app.appKey] && busy(app.appKey)" class="progress">
            <div class="bar">
              <span :style="{ width: percentOf(app.appKey) }" />
            </div>
            <p class="hint">
              {{ progress[app.appKey].message }}
              <span v-if="progress[app.appKey].percent >= 0">
                {{ progress[app.appKey].percent }}%
              </span>
            </p>
          </div>

          <p v-if="mustUpdate(app)" class="hint warn">
            该版本要求强制更新，更新到 {{ app.latestVersion }} 后才能打开。
          </p>

          <div class="card-actions">
            <template v-if="app.running">
              <button v-if="app.homepage" class="ghost" @click="openUrl(app.homepage)">
                主页
              </button>
            </template>
            <template v-else>
            <button
              v-if="!app.installed"
              class="primary"
              :disabled="busy(app.appKey)"
              @click="install(app)"
            >
              安装
            </button>
            <template v-else>
              <button
                v-if="app.hasUpdate"
                class="primary"
                :disabled="busy(app.appKey)"
                @click="install(app)"
              >
                更新
              </button>
              <button
                class="primary"
                :disabled="busy(app.appKey) || mustUpdate(app)"
                :title="mustUpdate(app) ? '请先更新到最新版本' : ''"
                @click="launch(app)"
              >
                打开
              </button>
              <button class="ghost danger" @click="uninstall(app)">卸载</button>
            </template>
            <button v-if="app.homepage" class="ghost" @click="openUrl(app.homepage)">
              主页
            </button>
            </template>
          </div>
        </article>
      </section>
    </main>

    <footer class="footer">
      <span>服务：{{ settings.baseUrl }}</span>
      <span v-if="platform">平台：{{ platform }} / {{ arch }}</span>
    </footer>

    <div v-if="settingsVisible" class="mask" @click.self="settingsVisible = false">
      <div class="modal">
        <h2>分发服务地址</h2>
        <p class="hint">
          本地开发默认 <code>http://127.0.0.1:3000/api/v1</code>，上线后改成实际域名。
        </p>
        <input v-model="draftBaseUrl" spellcheck="false" placeholder="http://127.0.0.1:3000/api/v1" />
        <div class="modal-actions">
          <button class="ghost" @click="settingsVisible = false">取消</button>
          <button class="primary" :disabled="saving" @click="saveSettings">保存</button>
        </div>
      </div>
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

const apps = ref<AppView[]>([]);
const platform = ref('');
const arch = ref('');
const settings = ref<Settings>({ baseUrl: 'http://127.0.0.1:3000/api/v1' });
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const busyKeys = ref<Record<string, boolean>>({});
const progress = ref<Record<string, Progress>>({});
const settingsVisible = ref(false);
const draftBaseUrl = ref('');

const updatesAvailable = computed(
  () => apps.value.filter((app) => app.hasUpdate).length,
);

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
  } catch (cause) {
    error.value = (cause as Error).message;
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
