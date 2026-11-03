<template>
  <n-drawer :show="show" :width="720" placement="right" @update:show="$emit('update:show', $event)">
    <n-drawer-content title="产物管理" closable>
      <n-empty v-if="!release" description="请选择版本" />
      <template v-else>
        <p class="muted">{{ release.versionName }}（versionCode {{ release.versionCode }}）</p>

        <n-data-table :columns="artifactColumns" :data="release.artifacts ?? []" :bordered="false" size="small" />

        <n-divider>上传产物</n-divider>
        <n-form class="upload-form" label-placement="top" :show-feedback="false">
          <n-form-item label="平台">
            <n-select v-model:value="form.platform" :options="platformOptions" />
          </n-form-item>
          <n-form-item label="架构">
            <n-select v-model:value="form.arch" :options="archOptions" />
          </n-form-item>
          <n-form-item label="格式">
            <n-select v-model:value="form.format" :options="formatOptions" />
          </n-form-item>
          <n-form-item :label="minOsLabel">
            <div class="min-os-field">
              <n-input v-model:value="form.minOs" :placeholder="minOsPlaceholder" />
              <span class="min-os-hint">指用户运行设备的操作系统版本，不是软件版本。</span>
            </div>
          </n-form-item>
          <n-form-item label="文件">
            <div
              class="file-drop"
              :class="{ dragging, 'has-file': form.file }"
              role="button"
              tabindex="0"
              @click="pickFile"
              @keydown.enter="pickFile"
              @dragenter.prevent="dragging = true"
              @dragover.prevent="dragging = true"
              @dragleave.prevent="dragging = false"
              @drop.prevent="onDrop"
            >
              <input ref="fileInput" class="file-input" type="file" @change="onFileChange" />
              <span class="file-mark" aria-hidden="true">↑</span>
              <span class="file-copy">
                <strong>{{ form.file ? form.file.name : '选择或拖入安装产物' }}</strong>
                <span>{{ form.file ? formatBytes(form.file.size) : '支持 APK、DMG、ZIP、MSI、EXE、AppImage、DEB' }}</span>
              </span>
              <span class="file-browse">{{ form.file ? '更换' : '浏览' }}</span>
            </div>
          </n-form-item>
        </n-form>
        <div style="display: flex; justify-content: flex-end">
          <n-button type="primary" :loading="uploading" @click="upload">上传</n-button>
        </div>
      </template>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
import {
  NButton, NDataTable, NDivider, NDrawer, NDrawerContent, NEmpty,
  NForm, NFormItem, NInput, NSelect, useDialog, useMessage,
} from 'naive-ui';
import type { DataTableColumns, SelectOption } from 'naive-ui';
import { computed, h, reactive, ref, watch } from 'vue';
import { formatBytes } from '@vakao/hub-shared';
import { api } from '@/api';
import type { ArtifactRow, ReleaseRow } from '@/api/types';

const props = defineProps<{
  show: boolean;
  release: ReleaseRow | null;
}>();

const emit = defineEmits<{
  'update:show': [value: boolean];
  changed: [];
}>();

const message = useMessage();
const dialog = useDialog();
const uploading = ref(false);
const dragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const form = reactive({
  platform: 'android',
  arch: 'universal',
  format: 'apk',
  minOs: '',
  file: null as File | null,
});

const formatOptionsByPlatform: Record<string, SelectOption[]> = {
  darwin: [{ label: 'dmg', value: 'dmg' }, { label: 'zip', value: 'zip' }],
  win32: [{ label: 'msi', value: 'msi' }, { label: 'exe', value: 'exe' }, { label: 'zip', value: 'zip' }],
  android: [{ label: 'apk', value: 'apk' }],
  linux: [{ label: 'appimage', value: 'appimage' }, { label: 'deb', value: 'deb' }, { label: 'zip', value: 'zip' }],
};

const platformOptions: SelectOption[] = [
  { label: 'macOS（darwin）', value: 'darwin' },
  { label: 'Windows（win32）', value: 'win32' },
  { label: 'Android', value: 'android' },
  { label: 'Linux', value: 'linux' },
];

const archOptions: SelectOption[] = [
  { label: 'universal', value: 'universal' },
  { label: 'arm64', value: 'arm64' },
  { label: 'x64', value: 'x64' },
];

const formatOptions = computed<SelectOption[]>(() => formatOptionsByPlatform[form.platform] ?? []);

const minOsLabel = computed(() => {
  const labels: Record<string, string> = {
    darwin: '最低 macOS 版本',
    win32: '最低 Windows 版本',
    android: '最低 Android 版本',
    linux: '最低 Linux 版本',
  };
  return labels[form.platform] ?? '最低系统版本';
});

const minOsPlaceholder = computed(() => {
  const placeholders: Record<string, string> = {
    darwin: '如 12.0（macOS Monterey）',
    win32: '如 10（Windows 10）',
    android: '如 8.0（Android 8）',
    linux: '如 20.04（Ubuntu）',
  };
  return placeholders[form.platform] ?? '运行设备最低系统版本';
});

const artifactColumns: DataTableColumns<ArtifactRow> = [
  { title: '平台', key: 'platform', width: 80 },
  { title: '架构', key: 'arch', width: 90 },
  { title: '格式', key: 'format', width: 80 },
  { title: '文件', key: 'fileName' },
  { title: '大小', key: 'size', width: 100, render: (row) => formatBytes(row.size) },
  { title: '下载', key: 'downloadCount', width: 70 },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    render: (row) => h(
      NButton,
      { size: 'tiny', type: 'error', secondary: true, onClick: () => confirmRemoveArtifact(row) },
      { default: () => '删除' },
    ),
  },
];

watch(
  () => form.platform,
  (platform) => {
    const allowed = formatOptionsByPlatform[platform] ?? [];
    if (!allowed.some((option) => option.value === form.format)) {
      form.format = String(allowed[0]?.value ?? '');
    }
  },
);

watch(
  () => props.show,
  (visible) => {
    if (visible) closeFile();
  },
);

function pickFile(): void {
  fileInput.value?.click();
}

function closeFile(): void {
  form.file = null;
  if (fileInput.value) fileInput.value.value = '';
}

function onFileChange(event: Event): void {
  form.file = (event.target as HTMLInputElement).files?.[0] ?? null;
}

function onDrop(event: DragEvent): void {
  dragging.value = false;
  form.file = event.dataTransfer?.files?.[0] ?? null;
}

async function upload(): Promise<void> {
  if (!props.release || !form.file) {
    message.warning('请选择文件');
    return;
  }
  uploading.value = true;
  try {
    const body = new FormData();
    body.append('releaseId', String(props.release.id));
    body.append('platform', form.platform);
    body.append('arch', form.arch);
    body.append('format', form.format);
    if (form.minOs) body.append('minOs', form.minOs);
    body.append('file', form.file);
    await api.artifacts.upload(body);
    message.success('上传成功');
    closeFile();
    emit('changed');
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
        emit('changed');
      } catch (error) {
        message.error((error as Error).message);
      }
    },
  });
}
</script>

<style scoped>
.upload-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.upload-form :deep(.n-form-item) {
  margin-bottom: 0;
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
</style>
