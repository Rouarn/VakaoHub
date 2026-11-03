<template>
  <div class="page">
    <div class="page-head">
      <div>
        <p class="hud">OBSERVABILITY / AUDIT</p>
        <h2 class="page-title">操作审计</h2>
      </div>
      <n-button size="small" :loading="loading" @click="load">刷新</n-button>
    </div>

    <n-data-table
      :columns="columns"
      :data="logs"
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
import { NButton, NDataTable, NPagination, NTag, useMessage } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { h, onMounted, ref } from 'vue';
import { api } from '@/api';
import type { AuditLog } from '@/api/types';
import { formatDateTime } from '@vakao/hub-shared';

const logs = ref<AuditLog[]>([]);
const loading = ref(false);
const message = useMessage();
let requestId = 0;
const page = ref(1);
const pageSize = 20;
const total = ref(0);

const columns: DataTableColumns<AuditLog> = [
  {
    title: '时间',
    key: 'createdAt',
    width: 170,
    render: (row) => formatDateTime(row.createdAt),
  },
  { title: '账号', key: 'username', width: 100 },
  {
    title: '方法',
    key: 'method',
    width: 90,
    render: (row) =>
      h(
        NTag,
        { size: 'small', type: row.method === 'DELETE' ? 'error' : 'warning' },
        { default: () => row.method },
      ),
  },
  { title: '路径', key: 'path', ellipsis: { tooltip: true } },
  {
    title: '状态',
    key: 'statusCode',
    width: 90,
    render: (row) =>
      h(
        NTag,
        {
          size: 'small',
          type: row.statusCode >= 400 ? 'error' : 'success',
        },
        { default: () => String(row.statusCode) },
      ),
  },
  { title: 'IP', key: 'ip', width: 140 },
];

async function load(): Promise<void> {
  const current = ++requestId;
  loading.value = true;
  try {
    const result = await api.auditLogs({ page: page.value, pageSize });
    // 快速翻页时，只接受最后一次请求的结果
    if (current !== requestId) return;
    logs.value = result.records;
    total.value = result.total;
  } catch (error) {
    if (current === requestId) message.error((error as Error).message);
  } finally {
    if (current === requestId) loading.value = false;
  }
}

onMounted(load);
</script>
