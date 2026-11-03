<template>
  <aside class="side">
    <div class="side-brand">
      <img :src="starUrl" class="side-star" alt="" />
      <div>
        <strong>VaKao Hub</strong>
        <span>ADMIN / CONSOLE</span>
      </div>
    </div>

    <nav class="side-nav">
      <div v-for="group in groups" :key="group.title" class="nav-group">
        <p class="hud">{{ group.title }}</p>
        <button
          v-for="item in group.items"
          :key="item.key"
          class="nav-item"
          :class="{ active: activeKey === item.key }"
          @click="$emit('navigate', item.key)"
        >
          <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path :d="item.icon" />
          </svg>
          <span class="nav-label">{{ item.label }}</span>
          <span class="nav-mark" aria-hidden="true"></span>
        </button>
      </div>
    </nav>

    <div class="side-foot">
      <div class="side-status">
        <i></i>
        <span>分发服务在线</span>
      </div>
      <div class="side-user">
        <span class="avatar">{{ initial }}</span>
        <div>
          <strong>{{ username }}</strong>
          <span>管理员</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import starUrl from '@/assets/star.png';

defineProps<{
  activeKey: string;
  username: string;
  initial: string;
}>();

defineEmits<{
  navigate: [path: string];
}>();

const groups = [
  {
    title: '概览',
    items: [{ key: '/dashboard', label: '总览', icon: 'M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z' }],
  },
  {
    title: '内容',
    items: [
      { key: '/apps', label: '应用管理', icon: 'M4 7.5h16v12H4zM8 7.5V5h8v2.5M4 12h16' },
      { key: '/releases', label: '版本与产物', icon: 'M12 3l8.5 4.5L12 12 3.5 7.5 12 3zM3.5 12L12 16.5 20.5 12M3.5 16.5L12 21l8.5-4.5' },
    ],
  },
  {
    title: '监控',
    items: [
      { key: '/events', label: '事件日志', icon: 'M3 12h4l2-6 4 12 2-6h6' },
      { key: '/audit', label: '操作审计', icon: 'M12 3l7.5 3v5.5c0 4.8-3.2 7.8-7.5 9-4.3-1.2-7.5-4.2-7.5-9V6L12 3zM9 12l2 2 4-4' },
    ],
  },
];
</script>
