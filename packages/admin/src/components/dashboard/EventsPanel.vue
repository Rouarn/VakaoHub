<template>
  <section class="panel">
    <header class="panel-head">
      <div>
        <p class="hud">EVENTS / 7 DAYS</p>
        <h2>最近事件</h2>
      </div>
    </header>

    <n-empty v-if="!events.length" description="暂无事件" size="small" />
    <div v-else class="events">
      <div v-for="item in events" :key="item.type" class="event-row">
        <span class="event-name">{{ item.type }}</span>
        <div class="event-bar">
          <span :style="{ width: eventWidth(item.count) }"></span>
        </div>
        <strong>{{ item.count }}</strong>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { NEmpty } from 'naive-ui';
import type { Stats } from '@/api/types';

const props = defineProps<{
  events: Stats['eventsLast7Days'];
}>();

function maxEvent(): number {
  return Math.max(1, ...props.events.map((item) => item.count));
}

function eventWidth(count: number): string {
  return `${Math.max(6, Math.round((count / maxEvent()) * 100))}%`;
}
</script>
