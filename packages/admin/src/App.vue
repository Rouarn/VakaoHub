<template>
  <n-config-provider
    :theme="isDark ? darkTheme : null"
    :theme-overrides="themeOverrides"
    :locale="zhCN"
    :date-locale="dateZhCN"
  >
    <n-message-provider>
      <n-dialog-provider>
        <router-view />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  NConfigProvider,
  NDialogProvider,
  NMessageProvider,
  darkTheme,
  dateZhCN,
  zhCN,
} from 'naive-ui';
import { createThemeOverrides } from './theme';
import { useTheme } from './composables/useTheme';

const { isDark } = useTheme();

const themeOverrides = computed(() => {
  // 依赖 isDark，主题切换后重新从 CSS 变量读取令牌。
  void isDark.value;
  return createThemeOverrides();
});
</script>
