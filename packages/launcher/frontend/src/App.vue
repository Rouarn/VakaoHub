<template>
  <div class="shell">
    <header v-if="!selected" class="topbar">
      <div class="brand">
        <img :src="starUrl" class="brand-star" alt="" />
        <div class="brand-name">
          <strong>VaKao Hub</strong>
          <span>SOFTWARE SUITE</span>
        </div>
      </div>

      <div class="toolbar">
        <button
          class="update-all"
          :disabled="!updateCount || updatingAll"
          @click="updateAll"
        >
          {{ updatingAll ? '更新中…' : updateCount ? `全部更新 (${updateCount})` : '已是最新' }}
        </button>

        <label class="sort">
          <span class="hud">排序</span>
          <select v-model="sortBy">
            <option value="recent">最近更新</option>
            <option value="name">名称</option>
            <option value="status">安装状态</option>
          </select>
        </label>

        <label class="search">
          <span aria-hidden="true">⌕</span>
          <input v-model="search" type="search" placeholder="搜索应用" autocomplete="off" />
        </label>

        <div class="view-toggle">
          <button :class="{ active: gridMode }" title="网格" @click="gridMode = true">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect x="2" y="2" width="5" height="5" rx="1" />
              <rect x="9" y="2" width="5" height="5" rx="1" />
              <rect x="2" y="9" width="5" height="5" rx="1" />
              <rect x="9" y="9" width="5" height="5" rx="1" />
            </svg>
          </button>
          <button :class="{ active: !gridMode }" title="列表" @click="gridMode = false">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect x="2" y="3" width="12" height="1.5" rx="0.75" />
              <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" />
              <rect x="2" y="11.5" width="12" height="1.5" rx="0.75" />
            </svg>
          </button>
        </div>

        <button class="icon-btn" title="设置" @click="openSettings">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 5.2A2.8 2.8 0 1 0 8 10.8 2.8 2.8 0 0 0 8 5.2Zm6 3.9v-1.8l-1.6-.3a4.7 4.7 0 0 0-.5-1.2l1-1.3-1.3-1.3-1.3 1a4.7 4.7 0 0 0-1.2-.5L8.8 2H7l-.3 1.6a4.7 4.7 0 0 0-1.2.5l-1.3-1L2.9 4.4l1 1.3a4.7 4.7 0 0 0-.5 1.2L2 7.3v1.8l1.6.3c.1.4.3.9.5 1.2l-1 1.3 1.3 1.3 1.3-1c.4.2.8.4 1.2.5l.3 1.6h1.8l.3-1.6c.4-.1.9-.3 1.2-.5l1.3 1 1.3-1.3-1-1.3c.2-.4.4-.8.5-1.2l1.6-.3Z" />
          </svg>
        </button>
      </div>
    </header>

    <main v-if="!selected" class="content">
      <div class="catalog-meta">
        <span class="hud">ALL APPS / {{ apps.length }}</span>
        <span class="hud">{{ installedCount }} INSTALLED</span>
        <span class="hud">{{ updateCount }} UPDATES</span>
        <span class="hud right">{{ platformLabel }} / {{ arch }}</span>
      </div>

      <div v-if="error" class="banner">
        <span>{{ error }}</span>
        <button @click="load">重试</button>
      </div>

      <div v-if="loading && !apps.length" class="empty">正在读取软件目录…</div>
      <div v-else-if="!visibleApps.length" class="empty">
        <p>{{ search ? '没有匹配的软件。' : '目录还是空的。' }}</p>
        <p class="hint">试试清空搜索，或到管理后台发布版本。</p>
      </div>

      <section v-else class="app-grid" :class="{ 'list-mode': !gridMode }">
        <article
          v-for="app in visibleApps"
          :key="app.appKey"
          class="app-card"
          :class="{ 'is-list': !gridMode }"
          @click="openDetail(app)"
        >
          <div class="card-top">
            <span class="version">
              <template v-if="app.installed && app.hasUpdate">
                {{ app.installedVersion }} <b>→</b> {{ app.latestVersion }}
              </template>
              <template v-else>v{{ app.latestVersion }}</template>
            </span>
            <a
              v-if="app.repoUrl"
              class="repo"
              :href="app.repoUrl"
              target="_blank"
              rel="noreferrer"
              @click.stop
            >
              GITHUB ↗
            </a>
          </div>

          <div class="card-head">
            <div class="app-icon" :style="{ background: colorFor(app.appKey) }">
              <img v-if="app.iconUrl" :src="app.iconUrl" :alt="app.name" />
              <span v-else>{{ initial(app.name) }}</span>
            </div>
            <div class="app-title">
              <h2>{{ app.name }}</h2>
              <div class="provider">
                <span>{{ app.category || 'application' }}</span>
                <span>由 VAKAO 提供</span>
              </div>
            </div>
            <span v-if="app.running" class="state running">当前运行</span>
            <span v-else-if="app.hasUpdate" class="state update">有可用更新</span>
            <span v-else-if="app.installed" class="state installed">已安装</span>
          </div>

          <p class="desc">{{ app.description || '暂无描述' }}</p>

          <div class="card-meta">
            <span>最后更新：{{ formatDate(app.latestPublishedAt) }}</span>
            <span class="format">{{ app.artifactFormat.toUpperCase() }} · {{ formatBytes(app.artifactSize) }}</span>
          </div>

          <div v-if="progress[app.appKey] && busy(app.appKey)" class="progress">
            <div class="bar"><span :style="{ width: percentOf(app.appKey) }"></span></div>
            <span class="hint">{{ progress[app.appKey].message }}</span>
          </div>

          <p v-if="app.duplicates?.length" class="notice">
            检测到 {{ app.duplicates.length + 1 }} 份安装，请保留一份。
          </p>

          <div class="card-bottom">
            <button
              class="action"
              :disabled="busy(app.appKey) || updatingAll"
              @click.stop="primaryAction(app)"
            >
              <template v-if="app.running">当前运行</template>
              <template v-else-if="!app.installed">安装</template>
              <template v-else-if="app.hasUpdate">更新至 {{ app.latestVersion }}</template>
              <template v-else>打开</template>
            </button>
            <button
              class="more"
              title="更多"
              @click.stop="toggleMenu(app)"
            >
              ⋯
            </button>
          </div>

          <div v-if="menuKey === app.appKey" class="card-menu" @click.stop>
            <button @click="openDetail(app)">查看详情</button>
            <button v-if="app.homepage" @click="openUrl(app.homepage)">打开主页</button>
            <button v-if="app.repoUrl" @click="openUrl(app.repoUrl)">查看源码</button>
            <button
              v-if="app.installed && !app.running"
              class="danger"
              @click="uninstall(app)"
            >
              卸载
            </button>
          </div>
        </article>
      </section>
    </main>

    <section v-else class="detail">
      <header class="detail-bar">
        <div class="detail-nav">
          <button class="back" @click="closeDetail">←</button>
          <button @click="prevApp" title="上一个">‹</button>
          <button @click="nextApp" title="下一个">›</button>
          <span class="hud">应用详情 / {{ selected.appKey }}</span>
        </div>
        <button class="icon-btn" @click="closeDetail">×</button>
      </header>

      <div class="detail-hero">
        <div class="detail-icon" :style="{ background: colorFor(selected.appKey) }">
          <img v-if="selected.iconUrl" :src="selected.iconUrl" :alt="selected.name" />
          <span v-else>{{ initial(selected.name) }}</span>
        </div>

        <div class="detail-title">
          <p class="hud">APPLICATION / {{ selected.category || 'SOFTWARE' }}</p>
          <h1>{{ selected.name }}</h1>
          <p class="tagline">{{ selectedMeta.tagline }}</p>
          <div class="detail-sub">
            <span>版本 {{ selected.installedVersion || selected.latestVersion }}</span>
            <span>{{ formatDate(selected.latestPublishedAt) }}</span>
            <span class="mono">{{ selected.artifactFormat.toUpperCase() }} · {{ formatBytes(selected.artifactSize) }}</span>
          </div>
        </div>

        <div class="detail-actions">
          <button class="action" :disabled="busy(selected.appKey)" @click="primaryAction(selected)">
            <template v-if="selected.running">当前运行</template>
            <template v-else-if="!selected.installed">安装</template>
            <template v-else-if="selected.hasUpdate">更新至 {{ selected.latestVersion }}</template>
            <template v-else>打开</template>
          </button>
          <button class="more detail-more" @click="toggleMenu(selected)">⋯</button>
          <div v-if="menuKey === selected.appKey" class="card-menu detail-menu" @click.stop>
            <button v-if="selected.homepage" @click="openUrl(selected.homepage)">打开主页</button>
            <button v-if="selected.repoUrl" @click="openUrl(selected.repoUrl)">查看源码</button>
            <button
              v-if="selected.installed && !selected.running"
              class="danger"
              @click="uninstall(selected)"
            >
              卸载
            </button>
          </div>
        </div>
      </div>

      <div class="detail-links">
        <a v-if="selected.homepage" :href="selected.homepage" target="_blank" rel="noreferrer">网站 ↗</a>
        <a v-if="selected.repoUrl" :href="selected.repoUrl" target="_blank" rel="noreferrer">GITHUB ↗</a>
        <a v-if="selected.repoUrl" :href="releaseUrl(selected)" target="_blank" rel="noreferrer">版本发布 ↗</a>
        <span v-if="selected.running" class="link-state">当前运行中</span>
        <span v-if="selected.duplicates?.length" class="link-state warn">
          检测到多份安装
        </span>
      </div>

      <div class="detail-grid">
        <div class="gallery">
          <div v-if="selectedMeta.screenshots.length" class="screen-main">
            <img :src="selectedMeta.screenshots[screenIndex]" :alt="selected.name" />
            <template v-if="selectedMeta.screenshots.length > 1">
              <button class="screen-arrow left" @click="prevScreen">‹</button>
              <button class="screen-arrow right" @click="nextScreen">›</button>
              <span class="screen-count">{{ screenIndex + 1 }} / {{ selectedMeta.screenshots.length }}</span>
            </template>
          </div>
          <div v-else class="screen-fallback">
            <div class="fallback-icon" :style="{ background: colorFor(selected.appKey) }">
              <img v-if="selected.iconUrl" :src="selected.iconUrl" :alt="selected.name" />
              <span v-else>{{ initial(selected.name) }}</span>
            </div>
            <p class="hud">NO PREVIEW / APP ICON</p>
          </div>

          <div v-if="selectedMeta.screenshots.length > 1" class="thumbs">
            <button
              v-for="(shot, index) in selectedMeta.screenshots"
              :key="shot"
              :class="{ active: index === screenIndex }"
              @click="screenIndex = index"
            >
              <img :src="shot" alt="" />
            </button>
          </div>
        </div>

        <div class="features">
          <p class="hud">01 / 功能特性</p>
          <article v-for="(feature, index) in selectedMeta.features" :key="feature.title" class="feature">
            <span class="feature-index">{{ String(index + 1).padStart(2, '0') }}</span>
            <div>
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.description }}</p>
            </div>
          </article>
        </div>
      </div>

      <div class="release-info">
        <div>
          <span class="hud">版本</span>
          <strong>{{ selected.latestVersion }}</strong>
        </div>
        <div>
          <span class="hud">发布日期</span>
          <strong>{{ formatDate(selected.latestPublishedAt) }}</strong>
        </div>
        <div>
          <span class="hud">大小</span>
          <strong>{{ formatBytes(selected.artifactSize) }}</strong>
        </div>
        <div>
          <span class="hud">平台</span>
          <strong>{{ platformLabel }} · {{ selected.artifactFormat.toUpperCase() }}</strong>
        </div>
      </div>

      <div class="changelog">
        <p class="hud">02 / 更新日志</p>
        <ul>
          <li v-for="item in visibleChanges" :key="item">
            <span class="bullet"></span>{{ item }}
          </li>
        </ul>
        <button v-if="remainingChanges > 0" class="more-changes" @click="showAllChanges = !showAllChanges">
          {{ showAllChanges ? '收起' : `显示另外 ${remainingChanges} 项` }}
        </button>
      </div>
    </section>

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
          <button class="ghost-btn" @click="settingsVisible = false">取消</button>
          <button class="action" :disabled="saving" @click="saveSettings">保存</button>
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
import { appApi, type AppView, type Progress, type Settings } from './api';
import starUrl from './assets/star.png';

type Feature = { title: string; description: string };
type DetailMeta = {
  tagline: string;
  features: Feature[];
  screenshots: string[];
};

const DETAIL_META: Record<string, DetailMeta> = {
  vakaohub: {
    tagline: '把 VaKao 的软件，放在一个地方。',
    features: [
      { title: '一个目录，所有版本', description: 'Android 与 macOS 共用一套应用、版本与产物模型。' },
      { title: '发布状态可追溯', description: '灰度、全量、强更与回滚都在后台留痕。' },
      { title: '安装前后校验', description: 'SHA-256 与 macOS codesign 完整性检查。' },
      { title: '安静的更新', description: '启动即检查，不弹窗轰炸，也不静默替换正在使用的版本。' },
    ],
    screenshots: ['https://dist.woyuxiaji.cn/assets/screens/launcher.png'],
  },
  wiredeck: {
    tagline: '无线 ADB 桌面控制台。',
    features: [
      { title: '无线调试', description: '同一 Wi-Fi 下连接 Android 设备，不再插线。' },
      { title: 'USB 备用', description: '网络不可用时自动退回 USB 调试。' },
      { title: '桌面工作台', description: '设备、应用与日志集中在一个窗口。' },
      { title: '轻量原生', description: '不依赖浏览器运行时，启动即用。' },
    ],
    screenshots: ['https://dist.woyuxiaji.cn/assets/screens/wiredeck.png'],
  },
  dianmo: {
    tagline: '面向单机离线游戏的 Android 内存修改器。',
    features: [
      { title: 'Root 内存编辑', description: '需要 Root 权限，直接读写目标进程内存。' },
      { title: '单机离线', description: '只面向本地单机游戏，不接入在线服务。' },
      { title: '精确扫描', description: '按数值类型与范围定位并修改内存。' },
      { title: '轻量专注', description: '一个工具，只做一件事。' },
    ],
    screenshots: [],
  },
};

const apps = ref<AppView[]>([]);
const platform = ref('');
const arch = ref('');
const settings = ref<Settings>({ baseUrl: 'https://dist.woyuxiaji.cn/api/v1' });
const loading = ref(false);
const saving = ref(false);
const updatingAll = ref(false);
const error = ref('');
const busyKeys = ref<Record<string, boolean>>({});
const progress = ref<Record<string, Progress>>({});
const settingsVisible = ref(false);
const draftBaseUrl = ref('');
const search = ref('');
const sortBy = ref<'recent' | 'name' | 'status'>('recent');
const gridMode = ref(true);
const menuKey = ref('');
const selectedKey = ref('');
const screenIndex = ref(0);
const showAllChanges = ref(false);
const serviceOnline = ref(true);

const installedCount = computed(() => apps.value.filter((app) => app.installed).length);
const updateCount = computed(() => apps.value.filter((app) => app.hasUpdate).length);
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
const changelog = computed(() => {
  const text = selected.value?.updateLog || '';
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean);
});
const visibleChanges = computed(() =>
  showAllChanges.value ? changelog.value : changelog.value.slice(0, 6),
);
const remainingChanges = computed(() =>
  Math.max(0, changelog.value.length - 6),
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

async function updateAll(): Promise<void> {
  if (updatingAll.value) return;
  updatingAll.value = true;
  const targets = apps.value.filter((app) => app.hasUpdate && !app.running);
  for (const app of targets) {
    await install(app);
  }
  updatingAll.value = false;
}

async function primaryAction(app: AppView): Promise<void> {
  if (app.running) return;
  if (!app.installed || app.hasUpdate) {
    await install(app);
  } else {
    await launch(app);
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

function openDetail(app: AppView): void {
  menuKey.value = '';
  selectedKey.value = app.appKey;
  screenIndex.value = 0;
  showAllChanges.value = false;
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
  screenIndex.value = 0;
  showAllChanges.value = false;
}

function prevApp(): void {
  moveDetail(-1);
}

function nextApp(): void {
  moveDetail(1);
}

function prevScreen(): void {
  const count = selectedMeta.value.screenshots.length;
  if (!count) return;
  screenIndex.value = (screenIndex.value - 1 + count) % count;
}

function nextScreen(): void {
  const count = selectedMeta.value.screenshots.length;
  if (!count) return;
  screenIndex.value = (screenIndex.value + 1) % count;
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

function openUrl(url: string): void {
  api().OpenURL(url);
}

function busy(appKey: string): boolean {
  return Boolean(busyKeys.value[appKey]);
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

function formatDate(timestamp: number): string {
  if (!timestamp) return '—';
  const ms = timestamp > 1e12 ? timestamp : timestamp * 1000;
  return new Date(ms).toLocaleDateString('zh-CN');
}

function releaseUrl(app: AppView): string {
  return `${app.repoUrl.replace(/\.git$/, '').replace(/\/$/, '')}/releases`;
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
  window.addEventListener('click', closeMenu);
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
  window.removeEventListener('click', closeMenu);
  const runtime = (window as unknown as {
    runtime?: { EventsOff(name: string): void };
  }).runtime;
  runtime?.EventsOff('install:progress');
});
</script>
