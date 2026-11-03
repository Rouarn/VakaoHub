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

    <DashboardStats :cards="cards" />

    <div class="dashboard-grid">
      <FunnelPanel :funnel="funnel" />
      <EventsPanel :events="stats?.eventsLast7Days ?? []" />
    </div>

    <RecentReleasesPanel :releases="stats?.latestReleases ?? []" />
  </div>
</template>

<script setup lang="ts">
import { NButton, NSelect, useMessage } from 'naive-ui';
import type { SelectOption } from 'naive-ui';
import { computed, onMounted, ref } from 'vue';
import { formatBytes } from '@vakao/hub-shared';
import { api } from '@/api';
import type { AppRow, Funnel, Stats } from '@/api/types';
import DashboardStats from '@/components/dashboard/DashboardStats.vue';
import EventsPanel from '@/components/dashboard/EventsPanel.vue';
import FunnelPanel from '@/components/dashboard/FunnelPanel.vue';
import RecentReleasesPanel from '@/components/dashboard/RecentReleasesPanel.vue';

const stats = ref<Stats | null>(null);
const funnel = ref<Funnel | null>(null);
const apps = ref<AppRow[]>([]);
const funnelAppId = ref<number | null>(null);
const message = useMessage();
const loading = ref(false);
let loadRequestId = 0;
let funnelRequestId = 0;

const appOptions = computed<SelectOption[]>(() =>
  apps.value.map((app) => ({ label: `${app.name}（${app.appKey}）`, value: app.id })),
);

const cards = computed(() => [
  { label: '应用', value: stats.value?.counts.apps ?? 0, hud: 'APPLICATIONS' },
  { label: '版本', value: stats.value?.counts.releases ?? 0, hud: 'RELEASES' },
  { label: '产物', value: stats.value?.counts.artifacts ?? 0, hud: 'ARTIFACTS' },
  { label: '下载次数', value: stats.value?.downloads ?? 0, hud: 'DOWNLOADS' },
  { label: '事件', value: stats.value?.counts.events ?? 0, hud: 'EVENTS' },
  { label: '占用空间', value: formatBytes(stats.value?.storageBytes ?? 0), hud: 'STORAGE' },
]);

async function load(): Promise<void> {
  const requestId = ++loadRequestId;
  loading.value = true;
  try {
    const [statsResult] = await Promise.all([api.stats(), loadFunnel()]);
    if (requestId === loadRequestId) stats.value = statsResult;
  } catch (error) {
    if (requestId === loadRequestId) message.error((error as Error).message);
  } finally {
    if (requestId === loadRequestId) loading.value = false;
  }
}

async function loadFunnel(): Promise<void> {
  const requestId = ++funnelRequestId;
  try {
    const result = await api.funnel(funnelAppId.value ?? undefined);
    // 快速切换应用时，只接受最后一次请求的结果
    if (requestId === funnelRequestId) funnel.value = result;
  } catch (error) {
    if (requestId === funnelRequestId) message.error((error as Error).message);
  }
}

onMounted(async () => {
  try {
    apps.value = await api.apps.list();
  } catch (error) {
    message.error((error as Error).message);
  }
  await load();
});
</script>
