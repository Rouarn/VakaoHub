<template>
  <div class="page">
    <div class="page-head">
      <div>
        <p class="hud">OBSERVABILITY / EVENTS</p>
        <h2 class="page-title">事件日志</h2>
      </div>
      <div class="toolbar">
        <n-select
          v-model:value="appId"
          :options="appOptions"
          placeholder="全部应用"
          clearable
          style="width: 200px"
          @update:value="reload"
        />
        <n-select
          v-model:value="type"
          :options="typeOptions"
          placeholder="全部事件"
          clearable
          style="width: 180px"
          @update:value="reload"
        />
        <n-button size="small" :loading="loading" @click="load">刷新</n-button>
      </div>
    </div>

    <n-data-table
      :columns="columns"
      :data="events"
      :loading="loading"
      :bordered="false"
      size="small"
    />

    <div class="pager">
      <n-pagination
        v-model:page="page"
        :page-size="pageSize"
        :item-count="total"
        @update:page="load"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  NButton,
  NDataTable,
  NPagination,
  NSelect,
  NTag,
  useMessage,
} from 'naive-ui';
import type { DataTableColumns, SelectOption } from 'naive-ui';
import { computed, h, onMounted, ref } from 'vue';
import { api } from '@/api';
import type { AppRow, EventRow } from '@/api/types';
import { formatDateTime } from '@vakao/hub-shared';

const apps = ref<AppRow[]>([]);
const events = ref<EventRow[]>([]);
const loading = ref(false);
const message = useMessage();
let requestId = 0;
const page = ref(1);
const pageSize = 20;
const total = ref(0);
const appId = ref<number | null>(null);
const type = ref<string | null>(null);

const eventTypes = [
  'check',
  'download_start',
  'download_success',
  'download_fail',
  'verify_fail',
  'install_success',
  'install_fail',
  'launch',
  'open',
  'quit',
];

const typeOptions: SelectOption[] = eventTypes.map((item) => ({
  label: item,
  value: item,
}));

const appOptions = computed<SelectOption[]>(() =>
  apps.value.map((app) => ({ label: `${app.name}（${app.appKey}）`, value: app.id })),
);

const appNames = computed(() => {
  const map: Record<number, string> = {};
  for (const app of apps.value) map[app.id] = app.name;
  return map;
});

const columns: DataTableColumns<EventRow> = [
  {
    title: '时间',
    key: 'createdAt',
    width: 170,
    render: (row) => formatDateTime(row.createdAt),
  },
  {
    title: '应用',
    key: 'appId',
    width: 140,
    render: (row) => appNames.value[row.appId] ?? `#${row.appId}`,
  },
  {
    title: '事件',
    key: 'type',
    width: 160,
    render: (row) =>
      h(NTag, { size: 'small', type: 'info' }, { default: () => row.type }),
  },
  { title: '平台', key: 'platform', width: 90 },
  { title: '架构', key: 'arch', width: 90 },
  {
    title: '版本变化',
    key: 'version',
    width: 130,
    render: (row) => `${row.fromVersionCode ?? '-'} → ${row.toVersionCode ?? '-'}`,
  },
  {
    title: '设备',
    key: 'deviceId',
    ellipsis: { tooltip: true },
  },
];

async function loadApps(): Promise<void> {
  try {
    apps.value = await api.apps.list();
  } catch (error) {
    message.error((error as Error).message);
  }
}

async function load(): Promise<void> {
  const current = ++requestId;
  loading.value = true;
  try {
    const result = await api.events({
      page: page.value,
      pageSize,
      appId: appId.value ?? undefined,
      type: type.value ?? undefined,
    });
    // 快速切换筛选/翻页时，只接受最后一次请求的结果
    if (current !== requestId) return;
    events.value = result.records;
    total.value = result.total;
  } catch (error) {
    if (current === requestId) message.error((error as Error).message);
  } finally {
    if (current === requestId) loading.value = false;
  }
}

function reload(): void {
  page.value = 1;
  void load();
}

onMounted(async () => {
  await loadApps();
  await load();
});
</script>
