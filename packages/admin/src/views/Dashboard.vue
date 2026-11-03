<template>
  <div class="page dashboard">
    <header class="page-head">
      <div>
        <p class="hud">OVERVIEW / LIVE</p>
        <h1 class="page-title">运行概览</h1>
        <p class="page-sub">软件目录、发布状态与最近活动的实时切片。</p>
      </div>
      <div class="toolbar">
        <n-select
          v-model:value="funnelAppId"
          :options="appOptions"
          placeholder="全部应用"
          clearable
          size="small"
          style="width: 190px"
          @update:value="loadFunnel"
        />
        <n-button size="small" :loading="loading" @click="load">刷新</n-button>
      </div>
    </header>

    <section class="stat-grid">
      <article
        v-for="(card, index) in cards"
        :key="card.label"
        class="stat-card"
        :class="{ featured: index === 0 }"
      >
        <div class="stat-top">
          <span class="hud">{{ card.hud }}</span>
          <span class="stat-index">{{ String(index + 1).padStart(2, '0') }}</span>
        </div>
        <strong>{{ card.value }}</strong>
        <span>{{ card.label }}</span>
      </article>
    </section>

    <div class="dashboard-grid">
      <section class="panel">
        <header class="panel-head">
          <div>
            <p class="hud">FUNNEL / 30 DAYS</p>
            <h2>发布漏斗</h2>
          </div>
          <span class="panel-note">
            下载 {{ funnel?.rates.download ?? 0 }}% · 安装 {{ funnel?.rates.install ?? 0 }}%
          </span>
        </header>

        <div class="funnel">
          <div v-for="step in funnelSteps" :key="step.key" class="funnel-row">
            <div class="funnel-label">
              <span>{{ step.label }}</span>
              <strong>{{ funnel?.counts[step.key] ?? 0 }}</strong>
            </div>
            <div class="funnel-bar">
              <span :style="{ width: widthFor(step.key) }"></span>
            </div>
            <span class="funnel-rate">{{ percentFor(step.key) }}</span>
          </div>
        </div>
      </section>

      <section class="panel">
        <header class="panel-head">
          <div>
            <p class="hud">EVENTS / 7 DAYS</p>
            <h2>最近事件</h2>
          </div>
        </header>

        <n-empty v-if="!stats?.eventsLast7Days?.length" description="暂无事件" size="small" />
        <div v-else class="events">
          <div v-for="item in stats.eventsLast7Days" :key="item.type" class="event-row">
            <span class="event-name">{{ item.type }}</span>
            <div class="event-bar">
              <span :style="{ width: eventWidth(item.count) }"></span>
            </div>
            <strong>{{ item.count }}</strong>
          </div>
        </div>
      </section>
    </div>

    <section class="panel releases-panel">
      <header class="panel-head">
        <div>
          <p class="hud">RECENT RELEASES</p>
          <h2>最近版本</h2>
        </div>
        <router-link class="panel-link" to="/releases">查看全部 →</router-link>
      </header>
      <n-data-table
        :columns="releaseColumns"
        :data="stats?.latestReleases ?? []"
        :bordered="false"
        size="small"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { NButton, NDataTable, NEmpty, NSelect, NTag } from 'naive-ui';
import type { DataTableColumns, SelectOption } from 'naive-ui';
import { computed, h, onMounted, ref } from 'vue';
import { api } from '@/api';
import type { AppRow, Funnel, Stats } from '@/api/types';

const stats = ref<Stats | null>(null);
const funnel = ref<Funnel | null>(null);
const apps = ref<AppRow[]>([]);
const funnelAppId = ref<number | null>(null);

const appOptions = computed<SelectOption[]>(() =>
  apps.value.map((app) => ({ label: `${app.name}（${app.appKey}）`, value: app.id })),
);

const funnelSteps = [
  { key: 'check', label: '检查更新' },
  { key: 'download_start', label: '开始下载' },
  { key: 'download_success', label: '下载完成' },
  { key: 'install_success', label: '安装完成' },
];
const loading = ref(false);

const statusLabel: Record<number, string> = {
  0: '草稿',
  1: '灰度',
  2: '全量',
  3: '已下架',
};
const statusType: Record<number, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  0: 'default',
  1: 'info',
  2: 'success',
  3: 'error',
};

const releaseColumns: DataTableColumns<Stats['latestReleases'][number]> = [
  { title: '应用', key: 'appName', width: 160 },
  {
    title: '版本',
    key: 'versionName',
    width: 110,
    render: (row) => h('span', { class: 'mono' }, row.versionName),
  },
  {
    title: 'VERSION CODE',
    key: 'versionCode',
    width: 120,
    render: (row) => h('span', { class: 'mono muted' }, String(row.versionCode)),
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (row) =>
      h(
        NTag,
        { size: 'small', bordered: false, type: statusType[row.status] ?? 'default' },
        { default: () => statusLabel[row.status] ?? String(row.status) },
      ),
  },
  {
    title: '创建时间',
    key: 'createdAt',
    render: (row) => new Date(row.createdAt).toLocaleString(),
  },
];

const cards = computed(() => [
  { label: '应用', value: stats.value?.counts.apps ?? 0, hud: 'APPLICATIONS' },
  { label: '版本', value: stats.value?.counts.releases ?? 0, hud: 'RELEASES' },
  { label: '产物', value: stats.value?.counts.artifacts ?? 0, hud: 'ARTIFACTS' },
  { label: '下载次数', value: stats.value?.downloads ?? 0, hud: 'DOWNLOADS' },
  { label: '事件', value: stats.value?.counts.events ?? 0, hud: 'EVENTS' },
  { label: '占用空间', value: formatBytes(stats.value?.storageBytes ?? 0), hud: 'STORAGE' },
]);

function maxEvent(): number {
  return Math.max(1, ...(stats.value?.eventsLast7Days ?? []).map((item) => item.count));
}

function eventWidth(count: number): string {
  return `${Math.max(6, Math.round((count / maxEvent()) * 100))}%`;
}

function percentFor(key: string): string {
  const base = funnel.value?.counts.check ?? 0;
  const value = funnel.value?.counts[key] ?? 0;
  if (!base) return '0%';
  return `${Math.round((value / base) * 100)}%`;
}

function widthFor(key: string): string {
  const base = funnel.value?.counts.check ?? 0;
  const value = funnel.value?.counts[key] ?? 0;
  if (!base) return '0%';
  return `${Math.max(4, Math.round((value / base) * 100))}%`;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`;
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const [statsResult, funnelResult] = await Promise.all([
      api.stats(),
      api.funnel(funnelAppId.value ?? undefined),
    ]);
    stats.value = statsResult;
    funnel.value = funnelResult;
  } finally {
    loading.value = false;
  }
}

async function loadFunnel(): Promise<void> {
  funnel.value = await api.funnel(funnelAppId.value ?? undefined);
}

onMounted(async () => {
  apps.value = await api.apps.list();
  await load();
});
</script>

<style scoped>
.dashboard {
  padding-bottom: 40px;
}

.page-sub {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 12px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  margin-bottom: 18px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  padding: 14px 16px;
  border-left: 1px solid var(--line);
  min-width: 0;
}

.stat-card:first-child {
  border-left: 0;
  padding-left: 0;
}

.stat-card.featured strong {
  color: var(--ink);
}

.stat-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.stat-index {
  font-family: var(--mono);
  font-size: 8px;
  color: var(--faint);
}

.stat-card strong {
  margin-top: 8px;
  font-family: var(--display);
  font-size: 27px;
  line-height: 1;
  letter-spacing: -0.04em;
}

.stat-card > span:last-child {
  margin-top: 4px;
  font-size: 10px;
  color: var(--faint);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1.45fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}

.panel {
  padding: 18px 20px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--raised);
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.panel-head h2 {
  margin: 5px 0 0;
  font-family: var(--display);
  font-size: 17px;
  letter-spacing: -0.025em;
}

.panel-note {
  font-family: var(--mono);
  font-size: 9px;
  color: var(--faint);
}

.panel-link {
  font-size: 11px;
  color: var(--muted);
  text-decoration: none;
}

.panel-link:hover {
  color: var(--ink);
}

.funnel {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.funnel-row {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr) 42px;
  gap: 12px;
  align-items: center;
}

.funnel-label {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  color: var(--muted);
}

.funnel-label strong {
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 500;
  color: var(--ink);
}

.funnel-bar {
  height: 5px;
  border-radius: 3px;
  background: rgba(23, 21, 18, 0.07);
  overflow: hidden;
}

.funnel-bar span {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--blue), var(--purple));
}

.funnel-rate {
  font-family: var(--mono);
  font-size: 9px;
  color: var(--faint);
  text-align: right;
}

.events {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.event-row {
  display: grid;
  grid-template-columns: 118px minmax(0, 1fr) 32px;
  gap: 10px;
  align-items: center;
}

.event-name {
  font-family: var(--mono);
  font-size: 9px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-bar {
  height: 4px;
  border-radius: 2px;
  background: rgba(23, 21, 18, 0.07);
  overflow: hidden;
}

.event-bar span {
  display: block;
  height: 100%;
  background: var(--orange);
  border-radius: 2px;
}

.event-row strong {
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 500;
  text-align: right;
}

.releases-panel {
  padding-bottom: 8px;
}

.releases-panel :deep(.n-data-table) {
  background: transparent;
}

.releases-panel :deep(.n-data-table-th) {
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

@media (max-width: 1100px) {
  .stat-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .stat-card:nth-child(4) {
    border-left: 0;
    padding-left: 0;
  }

  .stat-card:nth-child(n + 4) {
    border-top: 1px solid var(--line);
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
