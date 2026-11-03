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
          <n-select
            v-model:value="appId"
            :options="appOptions"
            placeholder="选择应用"
            style="width: 240px"
          />
        </label>
        <div class="action-group">
          <n-button :disabled="!appId" @click="confirmRollback">回滚上一版</n-button>
          <n-button type="primary" :disabled="!appId" @click="openCreate">
            新建版本
          </n-button>
        </div>
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
      style="width: 600px"
    >
      <n-form label-placement="top" :show-feedback="false">
        <div class="create-grid">
          <n-form-item label="版本名称">
            <div class="create-field">
              <n-input v-model:value="createForm.versionName" placeholder="如 1.0.1" />
              <span class="create-hint">展示给用户的版本，例如 1.0.1。</span>
            </div>
          </n-form-item>

          <n-form-item label="构建号（versionCode）">
            <div class="create-field">
              <n-input-number
                v-model:value="createForm.versionCode"
                :min="1"
                :precision="0"
                style="width: 100%"
              />
              <span class="create-hint">
                必须大于当前最新构建号 {{ maxVersionCode }}，决定升级顺序。
              </span>
            </div>
          </n-form-item>
        </div>

        <div class="create-grid">
          <n-form-item label="发布通道">
            <n-select v-model:value="createForm.channel" :options="channelOptions" />
          </n-form-item>

          <n-form-item label="最低可更新构建号">
            <div class="create-field">
              <n-input-number
                v-model:value="createForm.minVersionCode"
                :min="0"
                :precision="0"
                style="width: 100%"
              />
              <span class="create-hint">
                已安装版本低于此构建号时不提示更新；0 表示不限制。
              </span>
            </div>
          </n-form-item>
        </div>

        <n-form-item label="更新说明">
          <n-input
            v-model:value="createForm.updateLog"
            type="textarea"
            placeholder="这一版改了什么"
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
          <n-form class="upload-form" label-placement="top" :show-feedback="false">
            <n-form-item label="平台">
              <n-select v-model:value="uploadForm.platform" :options="platformOptions" />
            </n-form-item>
            <n-form-item label="架构">
              <n-select v-model:value="uploadForm.arch" :options="archOptions" />
            </n-form-item>
            <n-form-item label="格式">
              <n-select v-model:value="uploadForm.format" :options="formatOptions" />
            </n-form-item>
            <n-form-item :label="minOsLabel">
              <div class="min-os-field">
                <n-input v-model:value="uploadForm.minOs" :placeholder="minOsPlaceholder" />
                <span class="min-os-hint">指用户运行设备的操作系统版本，不是软件版本。</span>
              </div>
            </n-form-item>
            <n-form-item label="文件">
              <div
                class="file-drop"
                :class="{ dragging, 'has-file': uploadForm.file }"
                role="button"
                tabindex="0"
                @click="pickFile"
                @keydown.enter="pickFile"
                @dragenter.prevent="dragging = true"
                @dragover.prevent="dragging = true"
                @dragleave.prevent="dragging = false"
                @drop.prevent="onDrop"
              >
                <input
                  ref="fileInput"
                  class="file-input"
                  type="file"
                  @change="onFileChange"
                />
                <span class="file-mark" aria-hidden="true">↑</span>
                <span class="file-copy">
                  <strong>{{ uploadForm.file ? uploadForm.file.name : '选择或拖入安装产物' }}</strong>
                  <span>
                    {{
                      uploadForm.file
                        ? formatBytes(uploadForm.file.size)
                        : '支持 APK、DMG、ZIP、MSI、EXE、AppImage、DEB'
                    }}
                  </span>
                </span>
                <span class="file-browse">{{ uploadForm.file ? '更换' : '浏览' }}</span>
              </div>
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
const dragging = ref(false);
const minOsLabel = computed(() => {
  const labels: Record<string, string> = {
    darwin: '最低 macOS 版本',
    win32: '最低 Windows 版本',
    android: '最低 Android 版本',
    linux: '最低 Linux 版本',
  };
  return labels[uploadForm.platform] ?? '最低系统版本';
});

const minOsPlaceholder = computed(() => {
  const placeholders: Record<string, string> = {
    darwin: '如 12.0（macOS Monterey）',
    win32: '如 10（Windows 10）',
    android: '如 8.0（Android 8）',
    linux: '如 20.04（Ubuntu）',
  };
  return placeholders[uploadForm.platform] ?? '运行设备最低系统版本';
});

const uploadForm = reactive({
  platform: 'android',
  arch: 'universal',
  format: 'apk',
  minOs: '',
  file: null as File | null,
});

const channelOptions: SelectOption[] = [
  { label: '稳定版（stable）', value: 'stable' },
  { label: '测试版（beta）', value: 'beta' },
];

const maxVersionCode = computed(() =>
  releases.value.reduce((max, item) => Math.max(max, item.versionCode), 0),
);

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
  { title: '构建号', key: 'versionCode', width: 100 },
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
  createForm.versionCode = maxVersionCode.value + 1;
  createForm.channel = 'stable';
  createForm.minVersionCode = 0;
  createForm.updateLog = '';
  createVisible.value = true;
}

async function saveCreate(): Promise<void> {
  if (!appId.value) return;
  if (!createForm.versionName || !createForm.versionCode) {
    message.warning('请填写版本名称与构建号');
    return;
  }
  if (createForm.versionCode <= maxVersionCode.value) {
    message.warning(`构建号必须大于当前最新构建号 ${maxVersionCode.value}`);
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

function pickFile(): void {
  fileInput.value?.click();
}

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  uploadForm.file = input.files?.[0] ?? null;
}

function onDrop(event: DragEvent): void {
  dragging.value = false;
  uploadForm.file = event.dataTransfer?.files?.[0] ?? null;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`;
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

<style scoped>
.file-drop {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 11px 12px;
  border: 1px dashed var(--line);
  border-radius: 7px;
  background: rgba(250, 249, 245, 0.5);
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease;
}

.file-drop:hover,
.file-drop.dragging {
  border-color: var(--accent);
  background: rgba(70, 166, 198, 0.05);
}

.file-drop.has-file {
  border-style: solid;
}

.file-input {
  display: none;
}

.file-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex: none;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--paper);
  color: var(--accent);
  font-family: var(--mono);
  font-size: 14px;
}

.file-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.file-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink);
  font-family: var(--display);
  font-size: 11px;
  font-weight: 600;
}

.file-copy span {
  color: var(--faint);
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.02em;
}

.file-browse {
  flex: none;
  padding: 4px 8px;
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--muted);
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.releases-head {
  align-items: flex-end;
}

.head-copy {
  min-width: 0;
}

.page-sub {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 12px;
}

.head-actions {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.app-picker {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.action-group {
  display: flex;
  gap: 8px;
}

@media (max-width: 900px) {
  .releases-head {
    align-items: flex-start;
  }

  .head-actions {
    width: 100%;
  }

  .app-picker {
    flex: 1;
  }

  .app-picker :deep(.n-select) {
    width: 100% !important;
  }
}

.min-os-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.min-os-hint {
  color: var(--faint);
  font-size: 10px;
  line-height: 1.4;
}

.create-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 12px;
}

.create-grid:last-of-type {
  margin-bottom: 16px;
}

.create-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
}

.create-hint {
  color: var(--faint);
  font-size: 10px;
  line-height: 1.45;
}

@media (max-width: 640px) {
  .create-grid {
    grid-template-columns: 1fr;
  }
}

.upload-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.upload-form :deep(.n-form-item) {
  margin-bottom: 0;
}
</style>