<template>
  <div class="detail-overlay" @click.self="$emit('close')">
    <section class="detail-panel" :style="themeVars">
      <div ref="detailScroll" class="detail-scroll" @scroll="onDetailScroll">
        <div class="detail-header">
          <header class="detail-bar">
            <div class="detail-nav">
              <button class="back" @click="$emit('close')">←</button>
              <button title="上一个" @click="$emit('prev')">‹</button>
              <button title="下一个" @click="$emit('next')">›</button>
              <span class="hud">应用详情 / {{ selected.appKey }}</span>
            </div>
            <button class="icon-btn" @click="$emit('close')">×</button>
          </header>

          <div class="detail-hero">
            <div
              class="detail-icon"
              :class="{ 'with-image': selected.iconUrl }"
              :style="selected.iconUrl ? {} : { background: appColor(selected) }"
            >
              <img v-if="selected.iconUrl" :src="selected.iconUrl" :alt="selected.name" />
              <span v-else>{{ initial(selected.name) }}</span>
            </div>

            <div class="detail-title">
              <p class="hud">APPLICATION / {{ selected.category || 'SOFTWARE' }}</p>
              <h1>{{ selected.name }}</h1>
              <p class="tagline">{{ meta.tagline }}</p>
              <div class="detail-sub">
                <span>版本 {{ selected.installedVersion || selected.latestVersion }}</span>
                <span>{{ formatDate(selected.latestPublishedAt) }}</span>
                <span class="mono">{{ selected.artifactFormat.toUpperCase() }} · {{ formatBytes(selected.artifactSize) }}</span>
              </div>
            </div>

            <div class="detail-actions">
              <button class="action" :disabled="busy || !supportsOs" @click="$emit('primary-action', selected)">
                <template v-if="selected.running">当前运行</template>
                <template v-else-if="!selected.installed">安装</template>
                <template v-else-if="selected.hasUpdate">更新至 {{ selected.latestVersion }}</template>
                <template v-else>打开</template>
              </button>
              <button class="more detail-more" @click.stop="$emit('toggle-menu', selected)">⋯</button>
              <div v-if="menuOpen" class="card-menu detail-menu" @click.stop>
                <button v-if="selected.running" disabled>当前运行</button>
                <button v-if="selected.installed && !selected.running" @click="$emit('launch', selected)">打开</button>
                <button v-if="selected.installed" @click="$emit('reveal', selected)">在访达中显示</button>
                <button v-if="selected.installed && !selected.running" @click="$emit('install', selected)">重新安装</button>
                <button @click="scrollToChangelog">更新说明</button>
                <button v-if="selected.homepage" @click="$emit('open-url', selected.homepage)">打开主页</button>
                <button v-if="selected.repoUrl" @click="$emit('open-url', selected.repoUrl)">查看源码</button>
                <div v-if="selected.installed && !selected.running" class="menu-divider"></div>
                <button
                  v-if="selected.installed && !selected.running"
                  class="danger"
                  @click="$emit('request-uninstall', selected)"
                >
                  卸载…
                </button>
              </div>
            </div>
          </div>

          <div class="detail-links">
            <a v-if="selected.homepage" :href="selected.homepage" @click.prevent="$emit('open-url', selected.homepage)">网站 ↗</a>
            <a v-if="selected.repoUrl" :href="selected.repoUrl" @click.prevent="$emit('open-url', selected.repoUrl)">GITHUB ↗</a>
            <a v-if="selected.docsUrl" :href="selected.docsUrl" @click.prevent="$emit('open-url', selected.docsUrl)">帮助文档 ↗</a>
            <a v-if="selected.releaseUrl || selected.repoUrl" :href="releaseUrl(selected)" @click.prevent="$emit('open-url', releaseUrl(selected))">版本发布 ↗</a>
            <span v-if="selected.running" class="link-state">当前运行中</span>
            <span v-if="selected.duplicates?.length" class="link-state warn">检测到多份安装</span>
          </div>
        </div>

        <div class="detail-body">
          <p v-if="!supportsOs" class="notice detail-notice">
            该版本需要 macOS {{ selected.minOs }} 或更高版本，当前系统为 {{ hostOsVersion || '未知' }}。
          </p>

          <div class="detail-grid">
            <div class="gallery">
              <div v-if="meta.screenshots.length" class="screen-main">
                <img :src="meta.screenshots[screenIndex]" :alt="selected.name" @load="updateScrollbar" />
                <template v-if="meta.screenshots.length > 1">
                  <button class="screen-arrow left" @click="prevScreen">‹</button>
                  <button class="screen-arrow right" @click="nextScreen">›</button>
                  <span class="screen-count">{{ screenIndex + 1 }} / {{ meta.screenshots.length }}</span>
                </template>
              </div>
              <div v-else class="screen-fallback">
                <div
                  class="fallback-icon"
                  :class="{ 'with-image': selected.iconUrl }"
                  :style="selected.iconUrl ? {} : { background: appColor(selected) }"
                >
                  <img v-if="selected.iconUrl" :src="selected.iconUrl" :alt="selected.name" />
                  <span v-else>{{ initial(selected.name) }}</span>
                </div>
                <p class="hud">NO PREVIEW / APP ICON</p>
              </div>

              <div v-if="meta.screenshots.length > 1" class="thumbs">
                <button
                  v-for="(shot, index) in meta.screenshots"
                  :key="shot"
                  :class="{ active: index === screenIndex }"
                  @click="screenIndex = index"
                >
                  <img :src="shot" alt="" />
                </button>
              </div>
            </div>

            <div class="features">
              <p class="hud">01 / 功能特性</p>
              <article v-for="(feature, index) in meta.features" :key="feature.title" class="feature">
                <span class="feature-index">{{ String(index + 1).padStart(2, '0') }}</span>
                <div>
                  <h3>{{ feature.title }}</h3>
                  <p>{{ feature.description }}</p>
                </div>
              </article>
            </div>
          </div>

          <div class="release-info">
            <div><span class="hud">版本</span><strong>{{ selected.latestVersion }}</strong></div>
            <div><span class="hud">发布日期</span><strong>{{ formatDate(selected.latestPublishedAt) }}</strong></div>
            <div><span class="hud">大小</span><strong>{{ formatBytes(selected.artifactSize) }}</strong></div>
            <div>
              <span class="hud">平台</span>
              <strong>
                {{ platformLabel }} · {{ selected.artifactFormat.toUpperCase() }}
                <span v-if="selected.minOs" class="min-os">≥ {{ selected.minOs }}</span>
              </strong>
            </div>
          </div>

          <div class="changelog">
            <p class="hud">02 / 更新日志</p>
            <ul>
              <li v-for="item in visibleChanges" :key="item">
                <span class="bullet"></span>{{ item }}
              </li>
            </ul>
            <button v-if="remainingChanges > 0" class="more-changes" @click="showAllChanges = !showAllChanges">
              {{ showAllChanges ? '收起' : `显示另外 ${remainingChanges} 项` }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="scrollable" class="scroll-rail" @mousedown="onRailMouseDown">
        <div
          class="scroll-thumb"
          :style="{ height: scrollThumbHeight + 'px', transform: `translateY(${scrollThumbTop}px)` }"
          @mousedown.stop="startScrollDrag"
        ></div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import type { AppView } from '../api';
import type { DetailMeta } from '../lib/meta';
import { appColor, releaseUrl } from '../lib/theme';
import { formatBytes, formatDate, initial } from '../lib/format';

const props = defineProps<{
  selected: AppView;
  meta: DetailMeta;
  themeVars: Record<string, string>;
  menuOpen: boolean;
  busy: boolean;
  supportsOs: boolean;
  hostOsVersion: string;
  platformLabel: string;
}>();

const emit = defineEmits<{
  close: [];
  prev: [];
  next: [];
  'primary-action': [app: AppView];
  'toggle-menu': [app: AppView];
  launch: [app: AppView];
  reveal: [app: AppView];
  install: [app: AppView];
  'open-url': [url: string];
  'request-uninstall': [app: AppView];
}>();

const detailScroll = ref<HTMLElement | null>(null);
const scrollable = ref(false);
const scrollThumbHeight = ref(0);
const scrollThumbTop = ref(0);
const screenIndex = ref(0);
const showAllChanges = ref(false);

const changes = computed(() => {
  const text = props.selected.updateLog || '';
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean);
});
const visibleChanges = computed(() => (showAllChanges.value ? changes.value : changes.value.slice(0, 6)));
const remainingChanges = computed(() => Math.max(0, changes.value.length - 6));

function updateScrollbar(): void {
  const element = detailScroll.value;
  if (!element) {
    scrollable.value = false;
    return;
  }
  const maxScroll = element.scrollHeight - element.clientHeight;
  scrollable.value = maxScroll > 2;
  if (!scrollable.value) {
    scrollThumbHeight.value = 0;
    scrollThumbTop.value = 0;
    return;
  }
  const trackHeight = element.clientHeight;
  const thumbHeight = Math.max(28, Math.round((trackHeight * trackHeight) / element.scrollHeight));
  scrollThumbHeight.value = Math.min(trackHeight, thumbHeight);
  const maxTop = trackHeight - scrollThumbHeight.value;
  scrollThumbTop.value = maxScroll > 0
    ? Math.round((element.scrollTop / maxScroll) * maxTop)
    : 0;
}

function resetDetailScroll(): void {
  void nextTick(() => {
    detailScroll.value?.scrollTo({ top: 0 });
    updateScrollbar();
    window.setTimeout(updateScrollbar, 240);
  });
}

function onDetailScroll(): void {
  updateScrollbar();
}

function onRailMouseDown(event: MouseEvent): void {
  const element = detailScroll.value;
  if (!element || event.target !== event.currentTarget) return;
  const rail = event.currentTarget as HTMLElement;
  const rect = rail.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
  const maxScroll = element.scrollHeight - element.clientHeight;
  element.scrollTop = ratio * maxScroll;
  updateScrollbar();
}

function startScrollDrag(event: MouseEvent): void {
  const element = detailScroll.value;
  if (!element) return;
  event.preventDefault();
  const startY = event.clientY;
  const startScroll = element.scrollTop;
  const maxScroll = element.scrollHeight - element.clientHeight;
  const maxTop = element.clientHeight - scrollThumbHeight.value;
  if (maxScroll <= 0 || maxTop <= 0) return;

  const onMove = (moveEvent: MouseEvent): void => {
    const delta = moveEvent.clientY - startY;
    element.scrollTop = Math.min(maxScroll, Math.max(0, startScroll + (delta / maxTop) * maxScroll));
    updateScrollbar();
  };
  const onUp = (): void => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    document.body.style.userSelect = '';
  };

  document.body.style.userSelect = 'none';
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function prevScreen(): void {
  screenIndex.value = (screenIndex.value - 1 + props.meta.screenshots.length) % props.meta.screenshots.length;
}

function nextScreen(): void {
  screenIndex.value = (screenIndex.value + 1) % props.meta.screenshots.length;
}

function scrollToChangelog(): void {
  document.querySelector('.changelog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

watch(
  () => props.selected.appKey,
  () => {
    screenIndex.value = 0;
    showAllChanges.value = false;
    resetDetailScroll();
  },
);

onMounted(() => {
  resetDetailScroll();
  window.addEventListener('resize', updateScrollbar);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateScrollbar);
});
</script>
