<template>
  <section class="panel releases-panel">
    <header class="panel-head">
      <div>
        <p class="hud">RECENT RELEASES</p>
        <h2>最近版本</h2>
      </div>
      <router-link class="panel-link" to="/releases">查看全部 →</router-link>
    </header>
    <n-data-table :columns="columns" :data="releases" :bordered="false" size="small" />
  </section>
</template>

<script setup lang="ts">
import { NDataTable, NTag } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { h } from 'vue';
import type { Stats } from '@/api/types';

defineProps<{
  releases: Stats['latestReleases'];
}>();

const statusLabel: Record<number, string> = { 0: '草稿', 1: '灰度', 2: '全量', 3: '已下架' };
const statusType: Record<number, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  0: 'default',
  1: 'info',
  2: 'success',
  3: 'error',
};

const columns: DataTableColumns<Stats['latestReleases'][number]> = [
  { title: '应用', key: 'appName', width: 160 },
  { title: '版本', key: 'versionName', width: 110, render: (row) => h('span', { class: 'mono' }, row.versionName) },
  { title: '构建号', key: 'versionCode', width: 100, render: (row) => h('span', { class: 'mono muted' }, String(row.versionCode)) },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (row) => h(NTag, { size: 'small', bordered: false, type: statusType[row.status] ?? 'default' }, { default: () => statusLabel[row.status] ?? String(row.status) }),
  },
  { title: '创建时间', key: 'createdAt', render: (row) => new Date(row.createdAt).toLocaleString() },
];
</script>
