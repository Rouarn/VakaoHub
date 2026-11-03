<template>
  <header class="topbar">
    <div class="topbar-title">
      <p class="hud">VAKAO / ADMIN</p>
      <strong>{{ title }}</strong>
    </div>
    <div class="topbar-actions">
      <span class="live"><i></i>LIVE</span>
      <button class="text-btn" @click="toggleTheme">{{ isDark ? '亮色' : '暗色' }}</button>
      <button class="text-btn" @click="$emit('open-password')">修改密码</button>
      <button class="text-btn" @click="$emit('logout')">退出</button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useTheme } from '@/composables/useTheme';

defineProps<{ title: string }>();
defineEmits<{ 'open-password': []; logout: [] }>();

const { isDark, toggleTheme } = useTheme();
</script>
