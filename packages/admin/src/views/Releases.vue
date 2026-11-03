<template>
  <div class="page">
    <div class="page-head">
      <div class="toolbar">
        <div>
          <p class="hud">CATALOG / RELEASES</p>
          <h2 class="page-title">版本与产物</h2>
        </div>
        <n-select
          v-model:value="appId"
          :options="appOptions"
          placeholder="选择应用"
          style="width: 220px"
        />
      </div>
      <div class="toolbar">
        <n-button :disabled="!appId" @click="confirmRollback">回滚上一版</n-button>
        <n-button type="primary" :disabled="!appId" @click="openCreate">
          新建版本
        </n-button>
      </div>
    </div>

    <n-data-table
      :columns="columns"
      :data="releases"
      :loading="loading"
      :bordered="false"
      size="small"
    />

    <n-modal
      v-model:show="createVisible"
      preset="card"
      title="新建版本"
      style="width: 520px"
    >
      <n-form label-placement="left" label-width="110">
        <n-form-item label="versionName">
          <n-input v-model:value="createForm.versionName" placeholder="1.0.2" />
        </n-form-item>
        <n-form-item label="versionCode">
          <n-input-number v-model:value="createForm.versionCode" :min="1" style="width: 100%" />
        </n-form-item>
        <n-form-item label="渠道">
          <n-select v-model:value="createForm.channel" :options="channelOptions" />
        </n-form-item>
        <n-form-item label="最低版本号">
          <n-input-number v-model:value="createForm.minVersionCode" :min="0" style="width: 100%" />
        </n-form-item>
        <n-form-item label="更新说明">
          <n-input
            v-model:value="createForm.updateLog"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 6 }"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 10px">
          <n-button @click="createVisible = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="saveCreate">创建</n-button>
        </div>
      </template>
    </n-modal>

    <n-modal
      v-model:show="publishVisible"
      preset="card"
      title="发布版本"
      style="width: 480px"
    >
      <p v-if="publishTarget" class="muted">
        {{ publishTarget.versionName }}（versionCode {{ publishTarget.versionCode }}）
      </p>
      <n-radio-group v-model:value="publishForm.mode">
        <n-space vertical>
          <n-radio value="full">全量发布</n-radio>
          <n-radio value="gray">灰度发布</n-radio>
        </n-space>
      </n-radio-group>
      <n-form-item
        v-if="publishForm.mode === 'gray'"
        label="灰度比例"
        style="margin-top: 14px"
      >
        <n-input-number
          v-model:value="publishForm.grayPercent"
          :min="1"
          :max="99"
          style="width: 100%"
        />
      </n-form-item>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 10px">
          <n-button @click="publishVisible = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="confirmPublish">发布</n-button>
        </div>
      </template>
    </n-modal>

    <n-drawer v-model:show="drawerVisible" :width="720" placement="right">
      <n-drawer-content title="产物管理" closable>
        <n-empty v-if="!drawerRelease" description="请选择版本" />
        <template v-else>
          <p class="muted">
            {{ drawerRelease.versionName }}（versionCode {{ drawerRelease.versionCode }}）
          </p>

          <n-data-table
            :columns="artifactColumns"
            :data="drawerRelease.artifacts ?? []"
            :bordered="false"
            size="small"
          />

          <n-divider>上传产物</n-divider>
          <n-form label-placement="left" label-width="90">
            <n-form-item label="平台">
              <n-select v-model:value="uploadForm.platform" :options="platformOptions" />
            </n-form-item>
            <n-form-item label="架构">
              <n-select v-model:value="uploadForm.arch" :options="archOptions" />
            </n-form-item>
            <n-form-item label="格式">
              <n-select v-model:value="uploadForm.format" :options="formatOptions" />
            </n-form-item>
            <n-form-item label="最低系统">
              <n-input v-model:value="uploadForm.minOs" placeholder="可选，如 12.0" />
            </n-form-item>
            <n-form-item label="文件">
              <input ref="fileInput" type="file" @change="onFileChange" />
            </n-form-item>
          </n-form>
          <div style="display: flex; justify-content: flex-end">
            <n-button type="primary" :loading="uploading" @click="upload">
              上传
            </n-button>
          </div>
        </template>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import {
  NButton,
  NDataTable,
  NDivider,
  NDrawer,
  NDrawerContent,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NRadio,
  NRadioGroup,
  NSelect,
  NSpace,
  NSwitch,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui';
import type { DataTableColumns, SelectOption } from 'naive-ui';
import { computed, h, onMounted, reactive, ref, watch } from 'vue';
import { api } from '@/api';
import type { AppRow, ArtifactRow, ReleaseRow } from '@/api/types';

const message = useMessage();
const dialog = useDialog();

const apps = ref<AppRow[]>([]);
const appId = ref<number | null>(null);
const releases = ref<ReleaseRow[]>([]);
const loading = ref(false);
const saving = ref(false);

const createVisible = ref(false);
const createForm = reactive({
  versionName: '',
  versionCode: 1,
  channel: 'stable',
  minVersionCode: 0,
  updateLog: '',
});

const publishVisible = ref(false);
const publishTarget = ref<ReleaseRow | null>(null);
const publishForm = reactive({
  mode: 'full' as 'full' | 'gray',
  grayPercent: 10,
});

const drawerVisible = ref(false);
const drawerRelease = ref<ReleaseRow | null>(null);
const uploading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const uploadForm = reactive({
  platform: 'android',
  arch: 'universal',
  format: 'apk',
  minOs: '',
  file: null as File | null,
});

const channelOptions: SelectOption[] = [
  { label: 'stable', value: 'stable' },
  { label: 'beta', value: 'beta' },
];

const platformOptions: SelectOption[] = [
  { label: 'android', value: 'android' },
  { label: 'darwin', value: 'darwin' },
  { label: 'win32', value: 'win32' },
  { label: 'linux', value: 'linux' },
];

const archOptions: SelectOption[] = [
  { label: 'universal', value: 'universal' },
  { label: 'arm64', value: 'arm64' },
  { label: 'x64', value: 'x64' },
];

const formatOptions: SelectOption[] = [
  { label: 'apk', value: 'apk' },
  { label: 'dmg', value: 'dmg' },
  { label: 'msi', value: 'msi' },
  { label: 'exe', value: 'exe' },
  { label: 'zip', value: 'zip' },
  { label: 'appimage', value: 'appimage' },
  { label: 'deb', value: 'deb' },
];

const appOptions = computed<SelectOption[]>(() =>
  apps.value.map((app) => ({ label: `${app.name}（${app.appKey}）`, value: app.id })),
);

const statusText: Record<number, string> = {
  0: '草稿',
  1: '灰度',
  2: '全量',
  3: '已下架',
};

const statusType: Record<number, 'default' | 'warning' | 'success' | 'error'> = {
  0: 'default',
  1: 'warning',
  2: 'success',
  3: 'error',
};

const STATUS_DRAFT = 0;
const STATUS_GRAY = 1;
const STATUS_PUBLISHED = 2;
const STATUS_OFFLINE = 3;

const columns: DataTableColumns<ReleaseRow> = [
  { title: '版本', key: 'versionName', width: 100 },
  { title: 'versionCode', key: 'versionCode', width: 110 },
  { title: '渠道', key: 'channel', width: 90 },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (row) =>
      h(
        NTag,
        { type: statusType[row.status] ?? 'default', size: 'small' },
        { default: () => statusText[row.status] ?? String(row.status) },
      ),
  },
  {
    title: '灰度',
    key: 'grayPercent',
    width: 70,
    render: (row) => (row.status === 1 ? `${row.grayPercent}%` : '—'),
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
  {
    title: '产物',
    key: 'artifacts',
    width: 70,
    render: (row) => row.artifacts?.length ?? 0,
  },
  {
    title: '发布时间',
    key: 'publishedAt',
    width: 160,
    render: (row) =>
      row.publishedAt ? new Date(row.publishedAt).toLocaleString() : '—',
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    render: (row) => {
      const actions = [
        h(NButton, { size: 'small', onClick: () => openDrawer(row) }, { default: () => '产物' }),
      ];
      // 与后端约束保持一致：
      // 草稿/灰度/已下架可发布；灰度/全量可下架；草稿/已下架可删除
      if (row.status === STATUS_DRAFT || row.status === STATUS_GRAY || row.status === STATUS_OFFLINE) {
        actions.push(
          h(NButton, { size: 'small', type: 'primary', onClick: () => openPublish(row) }, { default: () => '发布' }),
        );
      }
      if (row.status === STATUS_GRAY || row.status === STATUS_PUBLISHED) {
        actions.push(
          h(NButton, { size: 'small', onClick: () => confirmOffline(row) }, { default: () => '下架' }),
        );
      }
      if (row.status === STATUS_DRAFT || row.status === STATUS_OFFLINE) {
        actions.push(
          h(NButton, { size: 'small', type: 'error', secondary: true, onClick: () => confirmRemove(row) }, { default: () => '删除' }),
        );
      }
      return h(NSpace, { size: 6 }, { default: () => actions });
    },
  },
];

const artifactColumns: DataTableColumns<ArtifactRow> = [
  { title: '平台', key: 'platform', width: 80 },
  { title: '架构', key: 'arch', width: 90 },
  { title: '格式', key: 'format', width: 80 },
  { title: '文件', key: 'fileName' },
  {
    title: '大小',
    key: 'size',
    width: 100,
    render: (row) => `${(row.size / 1024 / 1024).toFixed(1)} MB`,
  },
  { title: '下载', key: 'downloadCount', width: 70 },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    render: (row) =>
      h(
        NButton,
        { size: 'tiny', type: 'error', secondary: true, onClick: () => confirmRemoveArtifact(row) },
        { default: () => '删除' },
      ),
  },
];

async function loadApps(): Promise<void> {
  apps.value = await api.apps.list();
  if (!appId.value && apps.value.length) {
    appId.value = apps.value[0].id;
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

async function loadReleases(): Promise<void> {
  if (!appId.value) {
    releases.value = [];
    return;
  }
  loading.value = true;
  try {
    const result = await api.releases.list({
      appId: appId.value,
      page: 1,
      pageSize: 100,
    });
    releases.value = result.records;
  } catch (error) {
    message.error((error as Error).message);
  } finally {
    loading.value = false;
  }
}

function openCreate(): void {
  createForm.versionName = '';
  createForm.versionCode = 1;
  createForm.channel = 'stable';
  createForm.minVersionCode = 0;
  createForm.updateLog = '';
  createVisible.value = true;
}

async function saveCreate(): Promise<void> {
  if (!appId.value) return;
  if (!createForm.versionName || !createForm.versionCode) {
    message.warning('请填写版本名与版本号');
    return;
  }
  saving.value = true;
  try {
    await api.releases.create({
      appId: appId.value,
      versionName: createForm.versionName,
      versionCode: createForm.versionCode,
      channel: createForm.channel,
      minVersionCode: createForm.minVersionCode,
      updateLog: createForm.updateLog || undefined,
    });
    message.success('已创建草稿版本');
    createVisible.value = false;
    await loadReleases();
  } catch (error) {
    message.error((error as Error).message);
  } finally {
    saving.value = false;
  }
}

function openPublish(row: ReleaseRow): void {
  publishTarget.value = row;
  publishForm.mode = 'full';
  publishForm.grayPercent = 10;
  publishVisible.value = true;
}

async function confirmPublish(): Promise<void> {
  if (!publishTarget.value) return;
  saving.value = true;
  try {
    await api.releases.publish(publishTarget.value.id, {
      mode: publishForm.mode,
      grayPercent: publishForm.mode === 'gray' ? publishForm.grayPercent : undefined,
    });
    message.success('已发布');
    publishVisible.value = false;
    await loadReleases();
  } catch (error) {
    message.error((error as Error).message);
  } finally {
    saving.value = false;
  }
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

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  uploadForm.file = input.files?.[0] ?? null;
}

async function upload(): Promise<void> {
  if (!drawerRelease.value) return;
  if (!uploadForm.file) {
    message.warning('请选择文件');
    return;
  }
  uploading.value = true;
  try {
    const form = new FormData();
    form.append('releaseId', String(drawerRelease.value.id));
    form.append('platform', uploadForm.platform);
    form.append('arch', uploadForm.arch);
    form.append('format', uploadForm.format);
    if (uploadForm.minOs) form.append('minOs', uploadForm.minOs);
    form.append('file', uploadForm.file);

    await api.artifacts.upload(form);
    message.success('上传成功');
    if (fileInput.value) fileInput.value.value = '';
    uploadForm.file = null;
    drawerRelease.value = await api.releases.detail(drawerRelease.value.id);
    await loadReleases();
  } catch (error) {
    message.error((error as Error).message);
  } finally {
    uploading.value = false;
  }
}

function confirmRemoveArtifact(row: ArtifactRow): void {
  dialog.warning({
    title: '删除产物',
    content: `确定删除 ${row.platform}/${row.arch}/${row.format} 产物？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.artifacts.remove(row.id);
        message.success('已删除');
        if (drawerRelease.value) {
          drawerRelease.value = await api.releases.detail(drawerRelease.value.id);
        }
        await loadReleases();
      } catch (error) {
        message.error((error as Error).message);
      }
    },
  });
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
