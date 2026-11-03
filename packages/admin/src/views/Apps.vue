<template>
  <div class="page">
    <div class="page-head">
      <div>
        <p class="hud">CATALOG / APPS</p>
        <h2 class="page-title">应用管理</h2>
      </div>
      <n-button type="primary" @click="openCreate">新建应用</n-button>
    </div>

    <n-data-table :columns="columns" :data="apps" :loading="loading" :bordered="false" size="small" />

    <AppFormModal v-model:show="modalVisible" :editing="editingRow" @saved="load" />
  </div>
</template>

<script setup lang="ts">
import { NButton, NDataTable, NSpace, useDialog, useMessage } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { h, onMounted, ref } from 'vue';
import { api } from '@/api';
import type { AppRow } from '@/api/types';
import AppFormModal from '@/components/AppFormModal.vue';

const message = useMessage();
const dialog = useDialog();

const apps = ref<AppRow[]>([]);
const loading = ref(false);
const modalVisible = ref(false);
const editingRow = ref<AppRow | null>(null);

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
          h(NButton, { size: 'small', type: 'error', secondary: true, onClick: () => confirmRemove(row) }, { default: () => '删除' }),
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

function openCreate(): void {
  editingRow.value = null;
  modalVisible.value = true;
}

function openEdit(row: AppRow): void {
  editingRow.value = row;
  modalVisible.value = true;
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
