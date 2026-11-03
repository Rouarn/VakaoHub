<template>
  <header class="masthead">
    <div class="brand">
      <img :src="starUrl" class="brand-star" alt="" />
      <div class="brand-name">
        <strong>VaKao Hub</strong>
      </div>
      <span class="brand-divider" aria-hidden="true"></span>
      <span class="brand-tag">SOFTWARE SUITE</span>
    </div>

    <div class="masthead-actions">
      <button class="icon-btn" title="设置" @click="$emit('open-settings')">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 5.2A2.8 2.8 0 1 0 8 10.8 2.8 2.8 0 0 0 8 5.2Zm6 3.9v-1.8l-1.6-.3a4.7 4.7 0 0 0-.5-1.2l1-1.3-1.3-1.3-1.3 1a4.7 4.7 0 0 0-1.2-.5L8.8 2H7l-.3 1.6a4.7 4.7 0 0 0-1.2.5l-1.3-1L2.9 4.4l1 1.3a4.7 4.7 0 0 0-.5 1.2L2 7.3v1.8l1.6.3c.1.4.3.9.5 1.2l-1 1.3 1.3 1.3 1.3-1c.4.2.8.4 1.2.5l.3 1.6h1.8l.3-1.6c.4-.1.9-.3 1.2-.5l1.3 1 1.3-1.3-1-1.3c.2-.4.4-.8.5-1.2l1.6-.3Z" />
        </svg>
      </button>
    </div>
  </header>

  <section class="toolbar-row">
    <button
      class="refresh-btn"
      :class="{ spinning: loading }"
      :title="loading ? '正在刷新…' : '刷新目录'"
      :disabled="loading"
      @click="$emit('refresh')"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M13.2 8a5.2 5.2 0 1 1-1.6-3.8M13.2 2.8v3.4H9.8" />
      </svg>
    </button>

    <button
      v-if="updateCount"
      class="update-all"
      :disabled="updatingAll"
      @click="$emit('update-all')"
    >
      {{ updatingAll ? '更新中…' : `全部更新 (${updateCount})` }}
    </button>

    <div class="toolbar">
      <label class="sort">
        <span class="hud">排序</span>
        <select :value="sortBy" @change="onSort">
          <option value="recent">最近更新</option>
          <option value="name">名称</option>
          <option value="status">安装状态</option>
        </select>
      </label>

      <label class="search">
        <span aria-hidden="true">⌕</span>
        <input
          :value="search"
          type="search"
          placeholder="搜索应用"
          autocomplete="off"
          @input="onSearch"
        />
      </label>

      <div class="view-toggle">
        <button :class="{ active: gridMode }" title="网格" @click="$emit('update:gridMode', true)">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <rect x="2" y="2" width="5" height="5" rx="1" />
            <rect x="9" y="2" width="5" height="5" rx="1" />
            <rect x="2" y="9" width="5" height="5" rx="1" />
            <rect x="9" y="9" width="5" height="5" rx="1" />
          </svg>
        </button>
        <button :class="{ active: !gridMode }" title="列表" @click="$emit('update:gridMode', false)">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <rect x="2" y="3" width="12" height="1.5" rx="0.75" />
            <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" />
            <rect x="2" y="11.5" width="12" height="1.5" rx="0.75" />
          </svg>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import starUrl from '../assets/star.png';

defineProps<{
  loading: boolean;
  updateCount: number;
  updatingAll: boolean;
  sortBy: 'recent' | 'name' | 'status';
  search: string;
  gridMode: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
  'open-settings': [];
  'update-all': [];
  'update:sortBy': [value: 'recent' | 'name' | 'status'];
  'update:search': [value: string];
  'update:gridMode': [value: boolean];
}>();

function onSort(event: Event): void {
  emit('update:sortBy', (event.target as HTMLSelectElement).value as 'recent' | 'name' | 'status');
}

function onSearch(event: Event): void {
  emit('update:search', (event.target as HTMLInputElement).value);
}
</script>
