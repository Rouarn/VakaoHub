<template>
  <div v-if="visible" class="settings-overlay" @click.self="$emit('close')">
    <section class="settings-window" role="dialog" aria-modal="true" aria-label="设置">
      <header class="settings-head">
        <img :src="starUrl" class="settings-icon" alt="" />
        <div class="settings-title">
          <h2>设置</h2>
          <p class="hud">VAKAO HUB · LAUNCHER {{ launcherVersion }}</p>
        </div>
        <button class="icon-btn settings-close" title="关闭" @click="$emit('close')">×</button>
      </header>

      <div class="settings-body">
        <div class="settings-col">
          <section class="settings-card">
            <p class="hud">外观</p>
            <div class="segmented">
              <button :class="{ active: themeMode === 'system' }" @click="$emit('theme-mode', 'system')">
                跟随系统
              </button>
              <button :class="{ active: themeMode === 'dark' }" @click="$emit('theme-mode', 'dark')">
                深色
              </button>
              <button :class="{ active: themeMode === 'light' }" @click="$emit('theme-mode', 'light')">
                浅色
              </button>
            </div>
            <p class="settings-note">跟随系统时会随 macOS 外观自动切换。</p>
          </section>

          <section class="settings-card">
            <p class="hud">更新</p>
            <div class="settings-row">
              <div>
                <strong>检查更新</strong>
                <span>自动检查软件目录的频率</span>
              </div>
              <select v-model.number="refreshMinutes" class="settings-select" @change="$emit('refresh-changed')">
                <option :value="0">手动</option>
                <option :value="15">每 15 分钟</option>
                <option :value="30">每 30 分钟</option>
                <option :value="60">每 1 小时</option>
              </select>
            </div>
            <div class="settings-actions">
              <button class="settings-secondary" :disabled="loading" @click="$emit('refresh-now')">立即检查</button>
              <span class="service-state" :class="{ offline: !serviceOnline }">
                <i></i>{{ serviceOnline ? '分发服务在线' : '分发服务离线' }}
              </span>
            </div>
          </section>

          <section class="settings-card">
            <p class="hud">分发服务</p>
            <div class="settings-row settings-row-start">
              <div>
                <strong>服务地址</strong>
                <span>安装、更新与校验都从这里读取</span>
              </div>
            </div>
            <input
              v-model="baseUrl"
              class="settings-input"
              spellcheck="false"
              placeholder="https://dist.woyuxiaji.cn/api/v1"
            />
            <div class="settings-actions">
              <button class="settings-secondary" @click="$emit('reset')">恢复默认</button>
              <button class="settings-primary" :disabled="saving" @click="$emit('save')">保存</button>
            </div>
          </section>
        </div>

        <div class="settings-col">
          <section class="settings-card">
            <p class="hud">安装位置</p>
            <div class="settings-row settings-row-start">
              <div>
                <strong>应用安装目录</strong>
                <span>新安装的应用会放在这里</span>
              </div>
            </div>
            <code class="settings-path">~/Applications</code>
          </section>

          <section class="settings-card">
            <p class="hud">关于</p>
            <div class="about-mark">
              <strong>VaKao Hub</strong>
              <span>软件中心启动器</span>
            </div>
            <div class="about-grid">
              <div><span class="hud">版本</span><strong>{{ launcherVersion }}</strong></div>
              <div><span class="hud">系统</span><strong>{{ platformLabel }} {{ hostOsVersion }}</strong></div>
              <div><span class="hud">架构</span><strong>{{ arch }}</strong></div>
            </div>
            <div class="settings-links">
              <button @click="$emit('open-url', 'https://github.com/Rouarn/VakaoHub')">GitHub ↗</button>
              <button @click="$emit('open-url', 'https://github.com/Rouarn/VakaoHub/releases')">版本发布 ↗</button>
              <button @click="$emit('open-url', 'https://github.com/Rouarn/VakaoHub#readme')">帮助文档 ↗</button>
            </div>
          </section>
        </div>
      </div>

      <footer class="settings-foot">
        <span class="hud">VAKAO HUB / {{ launcherVersion }}</span>
        <button class="settings-primary" @click="$emit('close')">完成</button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import starUrl from '../assets/star.png';
import type { ThemeMode } from '../composables/useTheme';

defineProps<{
  visible: boolean;
  themeMode: ThemeMode;
  serviceOnline: boolean;
  saving: boolean;
  loading: boolean;
  platformLabel: string;
  hostOsVersion: string;
  arch: string;
  launcherVersion: string;
}>();

const baseUrl = defineModel<string>('baseUrl', { required: true });
const refreshMinutes = defineModel<number>('refreshMinutes', { required: true });

defineEmits<{
  close: [];
  save: [];
  reset: [];
  'theme-mode': [mode: ThemeMode];
  'refresh-changed': [];
  'refresh-now': [];
  'open-url': [url: string];
}>();
</script>
