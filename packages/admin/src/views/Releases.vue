<template>
  <div class="page">
    <div class="page-head releases-head">
      <div class="head-copy">
        <p class="hud">CATALOG / RELEASES</p>
        <h2 class="page-title">版本与产物</h2>
        <p class="page-sub">按应用管理版本、产物与发布状态。</p>
      </div>

      <div class="head-actions">
        <label class="app-picker">
          <span class="hud">应用</span>
          <n-select v-model:value="appId" :options="appOptions" placeholder="选择应用" style="width: 240px" />
        </label>
        <div class="action-group">
          <n-button :disabled="!appId" @click="confirmRollback">回滚上一版</n-button>
          <n-button type="primary" :disabled="!appId" @click="createVisible = true">新建版本</n-button>
        </div>
      </div>
    </div>

    <n-data-table :columns="columns" :data="releases" :loading="loading" :bordered="false" size="small" />

    <CreateReleaseModal
      v-model:show="createVisible"
      :app-id="appId"
      :max-version-code="maxVersionCode"
      @saved="loadReleases"
    />
    <PublishReleaseModal v-model:show="publishVisible" :target="publishTarget" @saved="loadReleases" />
    <ArtifactDrawer v-model:show="drawerVisible" :release="drawerRelease" @changed="refreshDrawer" />
  </div>
</template>

<script setup lang="ts">
import { RELEASE_STATUS } from '@vakao/hub-shared';
import { NButton, NDataTable, NSelect, NSpace, NSwitch, NTag, useDialog, useMessage } from 'naive-ui';
import type { DataTableColumns, SelectOption } from 'naive-ui';
import { computed, h, onMounted, ref, watch } from 'vue';
import { api } from '@/api';
import type { AppRow, ReleaseRow } from '@/api/types';
import { STATUS_LABEL, STATUS_TAG_TYPE } from '@/lib/release-status';
import { formatDateTime } from '@vakao/hub-shared';
import ArtifactDrawer from '@/components/releases/ArtifactDrawer.vue';
import CreateReleaseModal from '@/components/releases/CreateReleaseModal.vue';
import PublishReleaseModal from '@/components/releases/PublishReleaseModal.vue';

const message = useMessage();
const dialog = useDialog();

const apps = ref<AppRow[]>([]);
const appId = ref<number | null>(null);
const releases = ref<ReleaseRow[]>([]);
const loading = ref(false);

const createVisible = ref(false);
const publishVisible = ref(false);
const publishTarget = ref<ReleaseRow | null>(null);
const drawerVisible = ref(false);
const drawerRelease = ref<ReleaseRow | null>(null);

const appOptions = computed<SelectOption[]>(() =>
  apps.value.map((app) => ({ label: `${app.name}（${app.appKey}）`, value: app.id })),
);

const maxVersionCode = computed(() =>
  releases.value.reduce((max, item) => Math.max(max, item.versionCode), 0),
);

const columns: DataTableColumns<ReleaseRow> = [
  { title: '版本', key: 'versionName', width: 100 },
  { title: '构建号', key: 'versionCode', width: 100 },
  { title: '渠道', key: 'channel', width: 90 },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (row) =>
      h(NTag, { type: STATUS_TAG_TYPE[row.status] ?? 'default', size: 'small' }, {
        default: () => STATUS_LABEL[row.status] ?? String(row.status),
      }),
  },
  {
    title: '灰度',
    key: 'grayPercent',
    width: 70,
    render: (row) => (row.status === RELEASE_STATUS.GRAY ? `${row.grayPercent}%` : '—'),
  },
  {
    title: '强更',
    key: 'forceUpdate',
    width: 80,
    render: (row) =>
      h(NSwitch, {
        value: row.forceUpdate === 1,
        size: 'small',
        'onUpdate:value': (value: boolean) => toggleForce(row, value),
      }),
  },
  { title: '产物', key: 'artifacts', width: 70, render: (row) => row.artifacts?.length ?? 0 },
  {
    title: '发布时间',
    key: 'publishedAt',
    width: 160,
    render: (row) => formatDateTime(row.publishedAt),
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    render: (row) => {
      const actions = [
        h(NButton, { size: 'small', onClick: () => openDrawer(row) }, { default: () => '产物' }),
      ];
      if (row.status === RELEASE_STATUS.DRAFT || row.status === RELEASE_STATUS.GRAY || row.status === RELEASE_STATUS.OFFLINE) {
        actions.push(h(NButton, { size: 'small', type: 'primary', onClick: () => openPublish(row) }, { default: () => '发布' }));
      }
      if (row.status === RELEASE_STATUS.GRAY || row.status === RELEASE_STATUS.PUBLISHED) {
        actions.push(h(NButton, { size: 'small', onClick: () => confirmOffline(row) }, { default: () => '下架' }));
      }
      if (row.status === RELEASE_STATUS.DRAFT || row.status === RELEASE_STATUS.OFFLINE) {
        actions.push(h(NButton, { size: 'small', type: 'error', secondary: true, onClick: () => confirmRemove(row) }, { default: () => '删除' }));
      }
      return h(NSpace, { size: 6 }, { default: () => actions });
    },
  },
];

async function loadApps(): Promise<void> {
  apps.value = await api.apps.list();
  if (!appId.value && apps.value.length) appId.value = apps.value[0].id;
}

async function loadReleases(): Promise<void> {
  if (!appId.value) {
    releases.value = [];
    return;
  }
  loading.value = true;
  try {
    const result = await api.releases.list({ appId: appId.value, page: 1, pageSize: 100 });
    releases.value = result.records;
  } catch (error) {
    message.error((error as Error).message);
  } finally {
    loading.value = false;
  }
}

function confirmRollback(): void {
  if (!appId.value) return;
  dialog.warning({
    title: '回滚版本',
    content: '将当前全量版本下架，并恢复上一个被自动下架的全量版本。确定继续？',
    positiveText: '回滚',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const target = await api.releases.rollback(appId.value as number);
        message.success(`已回滚到 ${target.versionName}`);
        await loadReleases();
      } catch (error) {
        message.error((error as Error).message);
      }
    },
  });
}

function openPublish(row: ReleaseRow): void {
  publishTarget.value = row;
  publishVisible.value = true;
}

function confirmOffline(row: ReleaseRow): void {
  dialog.warning({
    title: '下架版本',
    content: `确定下架 ${row.versionName}（${row.versionCode}）？`,
    positiveText: '下架',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.releases.offline(row.id);
        message.success('已下架');
        await loadReleases();
      } catch (error) {
        message.error((error as Error).message);
      }
    },
  });
}

async function toggleForce(row: ReleaseRow, enabled: boolean): Promise<void> {
  try {
    await api.releases.force(row.id, enabled);
    row.forceUpdate = enabled ? 1 : 0;
  } catch (error) {
    message.error((error as Error).message);
  }
}

function confirmRemove(row: ReleaseRow): void {
  dialog.warning({
    title: '删除版本',
    content: `确定删除 ${row.versionName}（${row.versionCode}）及其产物文件？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.releases.remove(row.id);
        message.success('已删除');
        await loadReleases();
      } catch (error) {
        message.error((error as Error).message);
      }
    },
  });
}

async function openDrawer(row: ReleaseRow): Promise<void> {
  drawerVisible.value = true;
  drawerRelease.value = await api.releases.detail(row.id);
}

async function refreshDrawer(): Promise<void> {
  if (drawerRelease.value) {
    drawerRelease.value = await api.releases.detail(drawerRelease.value.id);
  }
  await loadReleases();
}

watch(appId, () => {
  void loadReleases();
});

onMounted(async () => {
  try {
    await loadApps();
  } catch (error) {
    message.error((error as Error).message);
  }
});
</script>

<style scoped>
.releases-head { align-items: flex-end; }
.head-copy { min-width: 0; }
.page-sub { margin: 7px 0 0; color: var(--muted); font-size: 12px; }
.head-actions { display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap; }
.app-picker { display: flex; flex-direction: column; gap: 5px; }
.action-group { display: flex; gap: 8px; }

@media (max-width: 900px) {
  .releases-head { align-items: flex-start; }
  .head-actions { width: 100%; }
  .app-picker { flex: 1; }
  .app-picker :deep(.n-select) { width: 100% !important; }
}
</style>
