<template>
  <footer class="status-bar">
    <span class="status-copy">
      上次检查：{{ lastCheckedLabel }} · 来源：VAKAO API 和 GITHUB
    </span>
    <div class="status-actions">
      <span class="service-state" :class="{ offline: !serviceOnline }">
        <i></i>{{ serviceOnline ? '服务在线' : '服务离线' }}
      </span>
      <button title="GitHub" @click="$emit('open-url', 'https://github.com/Rouarn/VakaoHub')">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 1.5a6.5 6.5 0 0 0-2.1 12.7c.3 0 .4-.1.4-.3v-1.2c-1.7.4-2.1-.7-2.1-.7-.3-.7-.7-.9-.7-.9-.6-.4.1-.4.1-.4.6 0 1 .6 1 .6.6 1 1.5.7 1.9.5.1-.4.2-.7.4-.9-1.3-.1-2.6-.7-2.6-2.9 0-.6.2-1.2.6-1.6-.1-.1-.3-.8.1-1.6 0 0 .5-.2 1.7.6a5.8 5.8 0 0 1 3 0c1.2-.8 1.7-.6 1.7-.6.4.8.2 1.5.1 1.6.4.4.6 1 .6 1.6 0 2.2-1.3 2.8-2.6 2.9.2.2.4.5.4 1v1.5c0 .2.1.3.4.3A6.5 6.5 0 0 0 8 1.5Z" />
        </svg>
      </button>
      <button title="帮助文档" @click="$emit('open-url', 'https://dist.woyuxiaji.cn')">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="6" />
          <path d="M2 8h12M8 2c1.7 1.7 2.5 3.8 2.5 6S9.7 12.3 8 14c-1.7-1.7-2.5-3.8-2.5-6S6.3 3.7 8 2Z" />
        </svg>
      </button>
    </div>
  </footer>
</template>

<script setup lang="ts">
defineProps<{
  lastCheckedLabel: string;
  serviceOnline: boolean;
}>();

defineEmits<{
  'open-url': [url: string];
}>();
</script>
