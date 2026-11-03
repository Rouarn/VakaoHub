<template>
  <div class="page">
    <div class="page-head">
      <div>
        <p class="hud">CATALOG / APPS</p>
        <h2 class="page-title">应用管理</h2>
      </div>
      <n-button type="primary" @click="openCreate">新建应用</n-button>
    </div>

    <n-data-table
      :columns="columns"
      :data="apps"
      :loading="loading"
      :bordered="false"
      size="small"
    />

    <n-modal
      v-model:show="modalVisible"
      preset="card"
      :title="editingId ? '编辑应用' : '新建应用'"
      style="width: 520px"
    >
      <n-form label-placement="left" label-width="90">
        <n-form-item label="appKey">
          <n-input
            v-model:value="form.appKey"
            :disabled="Boolean(editingId)"
            placeholder="wiredeck"
          />
        </n-form-item>
        <n-form-item label="名称">
          <n-input v-model:value="form.name" placeholder="WireDeck" />
        </n-form-item>
        <n-form-item label="分类">
          <n-input v-model:value="form.category" placeholder="desktop / mobile / tool" />
        </n-form-item>
        <n-form-item label="图标 URL">
          <n-input v-model:value="form.iconUrl" placeholder="https://..." />
        </n-form-item>
        <n-form-item label="仓库">
          <n-input v-model:value="form.repoUrl" placeholder="https://github.com/..." />
        </n-form-item>
        <n-form-item label="主页">
          <n-input v-model:value="form.homepage" placeholder="https://..." />
        </n-form-item>
        <n-form-item label="帮助文档">
          <n-input v-model:value="form.docsUrl" placeholder="https://.../docs" />
        </n-form-item>
        <n-form-item label="版本发布">
          <n-input v-model:value="form.releaseUrl" placeholder="https://github.com/.../releases" />
        </n-form-item>
        <n-form-item label="描述">
          <n-input
            v-model:value="form.description"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 10px">
          <n-button @click="modalVisible = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="save">保存</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import {
  NButton,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSpace,
  useDialog,
  useMessage,
} from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { h, onMounted, reactive, ref } from 'vue';
import { api } from '@/api';
import type { AppRow } from '@/api/types';

const message = useMessage();
const dialog = useDialog();

const apps = ref<AppRow[]>([]);
const loading = ref(false);
const saving = ref(false);
const modalVisible = ref(false);
const editingId = ref<number | null>(null);

const form = reactive({
  appKey: '',
  name: '',
  category: '',
  iconUrl: '',
  repoUrl: '',
  homepage: '',
  docsUrl: '',
  releaseUrl: '',
  description: '',
});

const columns: DataTableColumns<AppRow> = [
  { title: 'appKey', key: 'appKey', width: 130 },
  { title: '名称', key: 'name', width: 160 },
  { title: '分类', key: 'category', width: 100 },
  {
    title: '仓库',
    key: 'repoUrl',
    render: (row) =>
      row.repoUrl
        ? h('a', { href: row.repoUrl, target: '_blank', rel: 'noreferrer' }, row.repoUrl)
        : '—',
  },
  {
    title: '创建时间',
    key: 'createdAt',
    width: 170,
    render: (row) => new Date(row.createdAt).toLocaleString(),
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render: (row) =>
      h(NSpace, { size: 8 }, {
        default: () => [
          h(NButton, { size: 'small', onClick: () => openEdit(row) }, { default: () => '编辑' }),
          h(
            NButton,
            { size: 'small', type: 'error', secondary: true, onClick: () => confirmRemove(row) },
            { default: () => '删除' },
          ),
        ],
      }),
  },
];

async function load(): Promise<void> {
  loading.value = true;
  try {
    apps.value = await api.apps.list();
  } catch (error) {
    message.error((error as Error).message);
  } finally {
    loading.value = false;
  }
}

function resetForm(): void {
  form.appKey = '';
  form.name = '';
  form.category = '';
  form.iconUrl = '';
  form.repoUrl = '';
  form.homepage = '';
  form.docsUrl = '';
  form.releaseUrl = '';
  form.description = '';
}

function openCreate(): void {
  editingId.value = null;
  resetForm();
  modalVisible.value = true;
}

function openEdit(row: AppRow): void {
  editingId.value = row.id;
  form.appKey = row.appKey;
  form.name = row.name;
  form.category = row.category ?? '';
  form.iconUrl = row.iconUrl ?? '';
  form.repoUrl = row.repoUrl ?? '';
  form.homepage = row.homepage ?? '';
  form.docsUrl = row.docsUrl ?? '';
  form.releaseUrl = row.releaseUrl ?? '';
  form.description = row.description ?? '';
  modalVisible.value = true;
}

async function save(): Promise<void> {
  if (!form.appKey || !form.name) {
    message.warning('appKey 与名称必填');
    return;
  }
  saving.value = true;
  try {
    const payload = {
      appKey: form.appKey,
      name: form.name,
      category: form.category || undefined,
      iconUrl: form.iconUrl || undefined,
      repoUrl: form.repoUrl || undefined,
      homepage: form.homepage || undefined,
      docsUrl: form.docsUrl || undefined,
      releaseUrl: form.releaseUrl || undefined,
      description: form.description || undefined,
    };
    if (editingId.value) {
      await api.apps.update(editingId.value, payload);
      message.success('已更新');
    } else {
      await api.apps.create(payload);
      message.success('已创建');
    }
    modalVisible.value = false;
    await load();
  } catch (error) {
    message.error((error as Error).message);
  } finally {
    saving.value = false;
  }
}

function confirmRemove(row: AppRow): void {
  dialog.warning({
    title: '删除应用',
    content: `确定删除 ${row.name}（${row.appKey}）？其版本、产物与磁盘文件会一并删除。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.apps.remove(row.id);
        message.success('已删除');
        await load();
      } catch (error) {
        message.error((error as Error).message);
      }
    },
  });
}

onMounted(load);
</script>
