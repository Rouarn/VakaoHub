<template>
  <div class="page">
    <div class="page-head">
      <h2 class="page-title">总览</h2>
      <div class="toolbar">
        <n-select
          v-model:value="funnelAppId"
          :options="appOptions"
          placeholder="全部应用"
          clearable
          style="width: 200px"
          @update:value="loadFunnel"
        />
        <n-button size="small" :loading="loading" @click="load">刷新</n-button>
      </div>
    </div>

    <div class="cards">
      <n-card v-for="card in cards" :key="card.label" size="small">
        <div class="muted">{{ card.label }}</div>
        <div class="card-value">{{ card.value }}</div>
      </n-card>
    </div>

    <n-card title="近 30 天漏斗" size="small" style="margin-bottom: 16px">
      <div class="funnel">
        <div v-for="step in funnelSteps" :key="step.key" class="funnel-step">
          <div class="muted">{{ step.label }}</div>
          <div class="card-value">{{ funnel?.counts[step.key] ?? 0 }}</div>
        </div>
      </div>
      <p class="muted">
        下载成功率 {{ funnel?.rates.download ?? 0 }}% · 安装成功率
        {{ funnel?.rates.install ?? 0 }}%
      </p>
    </n-card>

    <div class="panels">
      <n-card title="最近版本" size="small">
        <n-data-table
          :columns="releaseColumns"
          :data="stats?.latestReleases ?? []"
          :bordered="false"
          size="small"
        />
      </n-card>

      <n-card title="近 7 天事件" size="small">
        <n-empty v-if="!stats?.eventsLast7Days?.length" description="暂无事件" />
        <div v-for="item in stats?.eventsLast7Days ?? []" :key="item.type" class="event-row">
          <span class="mono">{{ item.type }}</span>
          <span>{{ item.count }}</span>
        </div>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NButton, NCard, NDataTable, NEmpty, NSelect } from 'naive-ui';
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
  { key: 'check', label: '检查' },
  { key: 'download_start', label: '开始下载' },
  { key: 'download_success', label: '下载成功' },
  { key: 'install_success', label: '安装成功' },
];
const loading = ref(false);

const statusLabel: Record<number, string> = {
  0: '草稿',
  1: '灰度',
  2: '全量',
  3: '已下架',
};

const releaseColumns: DataTableColumns<Stats['latestReleases'][number]> = [
  { title: '应用', key: 'appName', width: 160 },
  { title: '版本', key: 'versionName', width: 100 },
  { title: 'versionCode', key: 'versionCode', width: 110 },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (row) => statusLabel[row.status] ?? String(row.status),
  },
  {
    title: '创建时间',
    key: 'createdAt',
    render: (row) => new Date(row.createdAt).toLocaleString(),
  },
];

const cards = computed(() => [
  { label: '应用', value: stats.value?.counts.apps ?? 0 },
  { label: '版本', value: stats.value?.counts.releases ?? 0 },
  { label: '产物', value: stats.value?.counts.artifacts ?? 0 },
  { label: '下载次数', value: stats.value?.downloads ?? 0 },
  { label: '事件', value: stats.value?.counts.events ?? 0 },
  { label: '占用空间', value: formatBytes(stats.value?.storageBytes ?? 0) },
]);

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
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
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.card-value {
  font-size: 24px;
  font-weight: 600;
  margin-top: 6px;
}

.panels {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}

@media (max-width: 900px) {
  .panels {
    grid-template-columns: 1fr;
  }
}

.funnel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.funnel-step {
  padding: 10px 12px;
  border: 1px solid #eef0f3;
  border-radius: 8px;
}

.event-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eef0f3;
}
</style>
