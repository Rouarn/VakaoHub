<template>
  <div v-if="target" class="confirm-overlay" @click.self="$emit('close')">
    <div class="confirm-card" role="dialog" aria-modal="true">
      <p class="hud">UNINSTALL / {{ target.appKey }}</p>
      <h2>卸载 {{ target.name }}？</h2>
      <p class="confirm-desc">将删除 <code>{{ target.installPath }}</code>。</p>
      <label class="confirm-option">
        <input v-model="deleteData" type="checkbox" />
        <span>同时删除应用数据与设置（不可恢复）</span>
      </label>
      <div class="confirm-actions">
        <button class="ghost-btn" @click="$emit('close')">取消</button>
        <button class="action confirm-danger" @click="$emit('confirm')">卸载</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AppView } from '../api';

defineProps<{
  target: AppView | null;
}>();

const deleteData = defineModel<boolean>('deleteData', { required: true });

defineEmits<{
  close: [];
  confirm: [];
}>();
</script>
