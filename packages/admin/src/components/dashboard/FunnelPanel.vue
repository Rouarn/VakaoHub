<template>
  <section class="panel">
    <header class="panel-head">
      <div>
        <p class="hud">FUNNEL / 30 DAYS</p>
        <h2>发布漏斗</h2>
      </div>
      <span class="panel-note">
        下载 {{ funnel?.rates.download ?? 0 }}% · 安装 {{ funnel?.rates.install ?? 0 }}%
      </span>
    </header>

    <div class="funnel">
      <div v-for="step in steps" :key="step.key" class="funnel-row">
        <div class="funnel-label">
          <span>{{ step.label }}</span>
          <strong>{{ funnel?.counts[step.key] ?? 0 }}</strong>
        </div>
        <div class="funnel-bar">
          <span :style="{ width: widthFor(step.key) }"></span>
        </div>
        <span class="funnel-rate">{{ percentFor(step.key) }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Funnel } from '@/api/types';

const props = defineProps<{ funnel: Funnel | null }>();

const steps = [
  { key: 'check', label: '检查更新' },
  { key: 'download_start', label: '开始下载' },
  { key: 'download_success', label: '下载完成' },
  { key: 'install_success', label: '安装完成' },
];

function percentFor(key: string): string {
  const base = props.funnel?.counts.check ?? 0;
  const value = props.funnel?.counts[key] ?? 0;
  if (!base) return '0%';
  return `${Math.round((value / base) * 100)}%`;
}

function widthFor(key: string): string {
  const base = props.funnel?.counts.check ?? 0;
  const value = props.funnel?.counts[key] ?? 0;
  if (!base) return '0%';
  return `${Math.max(4, Math.round((value / base) * 100))}%`;
}
</script>
