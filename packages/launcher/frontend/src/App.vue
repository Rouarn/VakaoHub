<template>
  <div class="shell">
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
        <button
          class="icon-btn theme-toggle"
          :title="theme === 'dark' ? '切换到浅色' : '切换到深色'"
          :aria-label="theme === 'dark' ? '切换到浅色' : '切换到深色'"
          @click="toggleTheme"
        >
          <svg v-if="theme === 'dark'" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="3.1" />
            <path d="M8 1.4v1.7M8 12.9v1.7M1.4 8h1.7M12.9 8h1.7M3.3 3.3l1.2 1.2M11.5 11.5l1.2 1.2M12.7 3.3l-1.2 1.2M4.5 11.5l-1.2 1.2" />
          </svg>
          <svg v-else viewBox="0 0 16 16" aria-hidden="true">
            <path d="M13.4 9.5A5.6 5.6 0 0 1 6.5 2.6 5.6 5.6 0 1 0 13.4 9.5Z" />
          </svg>
        </button>

        <button class="icon-btn" title="设置" @click="openSettings">
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
        @click="load"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M13.2 8a5.2 5.2 0 1 1-1.6-3.8M13.2 2.8v3.4H9.8" />
        </svg>
      </button>

      <button
        v-if="updateCount"
        class="update-all"
        :disabled="updatingAll"
        @click="updateAll"
      >
        {{ updatingAll ? '更新中…' : `全部更新 (${updateCount})` }}
      </button>

      <div class="toolbar">
        <label class="sort">
          <span class="hud">排序</span>
          <select v-model="sortBy">
            <option value="recent">最近更新</option>
            <option value="name">名称</option>
            <option value="status">安装状态</option>
          </select>
        </label>

        <label class="search">
          <span aria-hidden="true">⌕</span>
          <input v-model="search" type="search" placeholder="搜索应用" autocomplete="off" />
        </label>

        <div class="view-toggle">
          <button :class="{ active: gridMode }" title="网格" @click="gridMode = true">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect x="2" y="2" width="5" height="5" rx="1" />
              <rect x="9" y="2" width="5" height="5" rx="1" />
              <rect x="2" y="9" width="5" height="5" rx="1" />
              <rect x="9" y="9" width="5" height="5" rx="1" />
            </svg>
          </button>
          <button :class="{ active: !gridMode }" title="列表" @click="gridMode = false">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect x="2" y="3" width="12" height="1.5" rx="0.75" />
              <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" />
              <rect x="2" y="11.5" width="12" height="1.5" rx="0.75" />
            </svg>
          </button>
        </div>
      </div>
    </section>

    <main ref="contentRef" class="content">
      <div v-if="error" class="banner">
        <span>{{ error }}</span>
        <button @click="load">重试</button>
      </div>

      <div v-if="loading && !apps.length" class="empty">正在读取软件目录…</div>
      <div v-else-if="!visibleApps.length" class="empty">
        <p>{{ search ? '没有匹配的软件。' : '目录还是空的。' }}</p>
        <p class="hint">试试清空搜索，或到管理后台发布版本。</p>
      </div>

      <div v-else class="app-sections">
        <section v-for="group in appGroups" :key="group.key" class="app-section">
          <div class="app-section-head">
            <span class="hud">{{ group.label }}</span>
            <span class="app-section-count">{{ group.apps.length }}</span>
          </div>

          <div class="app-grid" :class="{ 'list-mode': !gridMode }">
        <article
          v-for="app in group.apps"
          :key="app.appKey"
          class="app-card"
          :class="{ 'is-list': !gridMode }"
          :style="{ '--app-color': appColor(app) }"
          @click="openDetail(app)"
        >
          <div class="card-top">
            <span class="version">
              <template v-if="app.installed && app.hasUpdate">
                {{ app.installedVersion }} <b>→</b> {{ app.latestVersion }}
              </template>
              <template v-else>v{{ app.latestVersion }}</template>
            </span>
            <a
              v-if="app.repoUrl"
              class="repo"
              :href="app.repoUrl"
              rel="noreferrer"
              @click.stop.prevent="openUrl(app.repoUrl)"
            >
              GITHUB ↗
            </a>
          </div>

          <div class="card-head">
            <div
              class="app-icon"
              :class="{ 'with-image': app.iconUrl }"
              :style="app.iconUrl ? {} : { background: appColor(app) }"
            >
              <img v-if="app.iconUrl" :src="app.iconUrl" :alt="app.name" />
              <span v-else>{{ initial(app.name) }}</span>
            </div>
            <div class="app-title">
              <div class="title-line">
                <h2>{{ app.name }}</h2>
                <span class="provider-badge">由 VAKAO 提供</span>
              </div>
            </div>
            <span v-if="app.running" class="state running">当前运行</span>
            <span v-else-if="app.hasUpdate" class="state update">有可用更新</span>
            <span v-else-if="app.installed" class="state installed">已安装</span>
          </div>

          <p class="desc">{{ app.description || '暂无描述' }}</p>

          <div class="card-meta">
            <span>最后更新：{{ formatDate(app.latestPublishedAt) }}</span>
            <span class="format">{{ app.artifactFormat.toUpperCase() }} · {{ formatBytes(app.artifactSize) }}</span>
          </div>

          <div v-if="progress[app.appKey] && busy(app.appKey)" class="progress">
            <div class="bar"><span :style="{ width: percentOf(app.appKey) }"></span></div>
            <span class="hint">{{ progress[app.appKey].message }}</span>
          </div>

          <p v-if="app.duplicates?.length" class="notice">
            检测到 {{ app.duplicates.length + 1 }} 份安装，请保留一份。
          </p>

          <div class="card-bottom">
            <button
              class="action"
              :disabled="busy(app.appKey) || updatingAll || !supportsOs(app)"
              @click.stop="primaryAction(app)"
            >
              <template v-if="app.running">当前运行</template>
              <template v-else-if="!app.installed">安装</template>
              <template v-else-if="app.hasUpdate">更新至 {{ app.latestVersion }}</template>
              <template v-else>打开</template>
            </button>
            <button
              class="more"
              title="更多"
              @click.stop="toggleMenu(app)"
            >
              ⋯
            </button>
          </div>

          <div v-if="menuKey === app.appKey" class="card-menu" @click.stop>
            <button @click="openDetail(app)">查看详情</button>
            <button v-if="app.installed && !app.running" @click="launch(app)">打开</button>
            <button v-if="app.installed" @click="reveal(app)">在访达中显示</button>
            <button v-if="app.installed && !app.running" @click="install(app)">重新安装</button>
            <button v-if="app.homepage" @click="openUrl(app.homepage)">打开主页</button>
            <button v-if="app.repoUrl" @click="openUrl(app.repoUrl)">查看源码</button>
            <div v-if="app.installed && !app.running" class="menu-divider"></div>
            <button
              v-if="app.installed && !app.running"
              class="danger"
              @click="requestUninstall(app)"
            >
              卸载…
            </button>
          </div>
        </article>
          </div>
        </section>
      </div>
    </main>

    <div v-if="selected" class="detail-overlay" @click.self="closeDetail">
      <section class="detail-panel" :style="themeVars">
        <div ref="detailScroll" class="detail-scroll" @scroll="onDetailScroll">
          <div class="detail-header">
      <header class="detail-bar">
        <div class="detail-nav">
          <button class="back" @click="closeDetail">←</button>
          <button @click="prevApp" title="上一个">‹</button>
          <button @click="nextApp" title="下一个">›</button>
          <span class="hud">应用详情 / {{ selected.appKey }}</span>
        </div>
        <button class="icon-btn" @click="closeDetail">×</button>
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
          <p class="tagline">{{ selectedMeta.tagline }}</p>
          <div class="detail-sub">
            <span>版本 {{ selected.installedVersion || selected.latestVersion }}</span>
            <span>{{ formatDate(selected.latestPublishedAt) }}</span>
            <span class="mono">{{ selected.artifactFormat.toUpperCase() }} · {{ formatBytes(selected.artifactSize) }}</span>
          </div>
        </div>

        <div class="detail-actions">
          <button class="action" :disabled="busy(selected.appKey) || !supportsOs(selected)" @click="primaryAction(selected)">
            <template v-if="selected.running">当前运行</template>
            <template v-else-if="!selected.installed">安装</template>
            <template v-else-if="selected.hasUpdate">更新至 {{ selected.latestVersion }}</template>
            <template v-else>打开</template>
          </button>
          <button class="more detail-more" @click.stop="toggleMenu(selected)">⋯</button>
          <div v-if="menuKey === selected.appKey" class="card-menu detail-menu" @click.stop>
            <button v-if="selected.running" disabled>当前运行</button>
            <button v-if="selected.installed && !selected.running" @click="launch(selected)">打开</button>
            <button v-if="selected.installed" @click="reveal(selected)">在访达中显示</button>
            <button v-if="selected.installed && !selected.running" @click="install(selected)">重新安装</button>
            <button @click="scrollToChangelog">更新说明</button>
            <button v-if="selected.homepage" @click="openUrl(selected.homepage)">打开主页</button>
            <button v-if="selected.repoUrl" @click="openUrl(selected.repoUrl)">查看源码</button>
            <div v-if="selected.installed && !selected.running" class="menu-divider"></div>
            <button
              v-if="selected.installed && !selected.running"
              class="danger"
              @click="requestUninstall(selected)"
            >
              卸载…
            </button>
          </div>
        </div>
      </div>

      <div class="detail-links">
        <a v-if="selected.homepage" :href="selected.homepage" @click.prevent="openUrl(selected.homepage)">网站 ↗</a>
        <a v-if="selected.repoUrl" :href="selected.repoUrl" @click.prevent="openUrl(selected.repoUrl)">GITHUB ↗</a>
        <a v-if="selected.docsUrl" :href="selected.docsUrl" @click.prevent="openUrl(selected.docsUrl)">帮助文档 ↗</a>
        <a v-if="selected.releaseUrl || selected.repoUrl" :href="releaseUrl(selected)" @click.prevent="openUrl(releaseUrl(selected))">版本发布 ↗</a>
        <span v-if="selected.running" class="link-state">当前运行中</span>
        <span v-if="selected.duplicates?.length" class="link-state warn">
          检测到多份安装
        </span>
      </div>
          </div>

          <div class="detail-body">
      <p v-if="!supportsOs(selected)" class="notice detail-notice">
        该版本需要 macOS {{ selected.minOs }} 或更高版本，当前系统为 {{ hostOsVersion || '未知' }}。
      </p>

      <div class="detail-grid">
        <div class="gallery">
          <div v-if="selectedMeta.screenshots.length" class="screen-main">
            <img :src="selectedMeta.screenshots[screenIndex]" :alt="selected.name" @load="updateScrollbar" />
            <template v-if="selectedMeta.screenshots.length > 1">
              <button class="screen-arrow left" @click="prevScreen">‹</button>
              <button class="screen-arrow right" @click="nextScreen">›</button>
              <span class="screen-count">{{ screenIndex + 1 }} / {{ selectedMeta.screenshots.length }}</span>
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

          <div v-if="selectedMeta.screenshots.length > 1" class="thumbs">
            <button
              v-for="(shot, index) in selectedMeta.screenshots"
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
          <article v-for="(feature, index) in selectedMeta.features" :key="feature.title" class="feature">
            <span class="feature-index">{{ String(index + 1).padStart(2, '0') }}</span>
            <div>
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.description }}</p>
            </div>
          </article>
        </div>
      </div>

      <div class="release-info">
        <div>
          <span class="hud">版本</span>
          <strong>{{ selected.latestVersion }}</strong>
        </div>
        <div>
          <span class="hud">发布日期</span>
          <strong>{{ formatDate(selected.latestPublishedAt) }}</strong>
        </div>
        <div>
          <span class="hud">大小</span>
          <strong>{{ formatBytes(selected.artifactSize) }}</strong>
        </div>
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

    <div v-if="settingsVisible" class="settings-overlay" @click.self="settingsVisible = false">
      <section class="settings-window" role="dialog" aria-modal="true" aria-label="设置">
        <header class="settings-head">
          <img :src="starUrl" class="settings-icon" alt="" />
          <div class="settings-title">
            <h2>设置</h2>
            <p class="hud">VAKAO HUB · LAUNCHER {{ launcherVersion }}</p>
          </div>
          <button class="icon-btn settings-close" title="关闭" @click="settingsVisible = false">×</button>
        </header>

        <div class="settings-body">
          <div class="settings-col">
            <section class="settings-card">
              <p class="hud">外观</p>
              <div class="segmented">
                <button :class="{ active: themeMode === 'system' }" @click="setThemeMode('system')">
                  跟随系统
                </button>
                <button :class="{ active: themeMode === 'dark' }" @click="setThemeMode('dark')">
                  深色
                </button>
                <button :class="{ active: themeMode === 'light' }" @click="setThemeMode('light')">
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
                <select v-model.number="refreshMinutes" class="settings-select" @change="saveRefreshInterval">
                  <option :value="0">手动</option>
                  <option :value="15">每 15 分钟</option>
                  <option :value="30">每 30 分钟</option>
                  <option :value="60">每 1 小时</option>
                </select>
              </div>
              <div class="settings-actions">
                <button class="settings-secondary" :disabled="loading" @click="load">立即检查</button>
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
                v-model="draftBaseUrl"
                class="settings-input"
                spellcheck="false"
                placeholder="https://dist.woyuxiaji.cn/api/v1"
              />
              <div class="settings-actions">
                <button class="settings-secondary" @click="resetBaseUrl">恢复默认</button>
                <button class="settings-primary" :disabled="saving" @click="saveSettings">保存</button>
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
                <button @click="openUrl('https://github.com/Rouarn/VakaoHub')">GitHub ↗</button>
                <button @click="openUrl('https://github.com/Rouarn/VakaoHub/releases')">版本发布 ↗</button>
                <button @click="openUrl('https://github.com/Rouarn/VakaoHub#readme')">帮助文档 ↗</button>
              </div>
            </section>
          </div>
        </div>

        <footer class="settings-foot">
          <span class="hud">VAKAO HUB / {{ launcherVersion }}</span>
          <button class="settings-primary" @click="settingsVisible = false">完成</button>
        </footer>
      </section>
    </div>

    <div v-if="uninstallTarget" class="confirm-overlay" @click.self="uninstallTarget = null">
      <div class="confirm-card" role="dialog" aria-modal="true">
        <p class="hud">UNINSTALL / {{ uninstallTarget.appKey }}</p>
        <h2>卸载 {{ uninstallTarget.name }}？</h2>
        <p class="confirm-desc">
          将删除 <code>{{ uninstallTarget.installPath }}</code>。
        </p>
        <label class="confirm-option">
          <input v-model="deleteUninstallData" type="checkbox" />
          <span>同时删除应用数据与设置（不可恢复）</span>
        </label>
        <div class="confirm-actions">
          <button class="ghost-btn" @click="uninstallTarget = null">取消</button>
          <button class="action confirm-danger" @click="confirmUninstall">卸载</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { appApi, type AppView, type Progress, type Settings } from './api';
import starUrl from './assets/star.png';

type Feature = { title: string; description: string };
type DetailMeta = {
  tagline: string;
  features: Feature[];
  screenshots: string[];
};

const DETAIL_META: Record<string, DetailMeta> = {
  vakaohub: {
    tagline: '把 VaKao 的软件，放在一个地方。',
    features: [
      { title: '一个目录，所有版本', description: 'Android 与 macOS 共用一套应用、版本与产物模型。' },
      { title: '发布状态可追溯', description: '灰度、全量、强更与回滚都在后台留痕。' },
      { title: '安装前后校验', description: 'SHA-256 与 macOS codesign 完整性检查。' },
      { title: '安静的更新', description: '启动即检查，不弹窗轰炸，也不静默替换正在使用的版本。' },
    ],
    screenshots: ['https://dist.woyuxiaji.cn/assets/screens/launcher.png'],
  },
  wiredeck: {
    tagline: '无线 ADB 桌面控制台。',
    features: [
      { title: '无线调试', description: '同一 Wi-Fi 下连接 Android 设备，不再插线。' },
      { title: 'USB 备用', description: '网络不可用时自动退回 USB 调试。' },
      { title: '桌面工作台', description: '设备、应用与日志集中在一个窗口。' },
      { title: '轻量原生', description: '不依赖浏览器运行时，启动即用。' },
    ],
    screenshots: ['https://dist.woyuxiaji.cn/assets/screens/wiredeck.png'],
  },
  dianmo: {
    tagline: '面向单机离线游戏的 Android 内存修改器。',
    features: [
      { title: 'Root 内存编辑', description: '需要 Root 权限，直接读写目标进程内存。' },
      { title: '单机离线', description: '只面向本地单机游戏，不接入在线服务。' },
      { title: '精确扫描', description: '按数值类型与范围定位并修改内存。' },
      { title: '轻量专注', description: '一个工具，只做一件事。' },
    ],
    screenshots: [],
  },
};

const apps = ref<AppView[]>([]);
const platform = ref('');
const arch = ref('');
type ThemeMode = 'system' | 'light' | 'dark';

const launcherVersion = '1.0.0';

function systemTheme(): 'light' | 'dark' {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function initialThemeMode(): ThemeMode {
  try {
    const savedMode = localStorage.getItem('vakaohub-theme-mode');
    if (savedMode === 'system' || savedMode === 'dark' || savedMode === 'light') {
      return savedMode;
    }
    const savedTheme = localStorage.getItem('vakaohub-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
  } catch {
    // localStorage 不可用时跟随系统。
  }
  return 'system';
}

function initialRefreshMinutes(): number {
  try {
    const value = Number(localStorage.getItem('vakaohub-refresh-minutes'));
    if (value === 0 || value === 15 || value === 30 || value === 60) return value;
  } catch {
    // localStorage 不可用时使用默认值。
  }
  return 30;
}

const hostOsVersion = ref('');
const contentRef = ref<HTMLElement | null>(null);
let initialScrollDone = false;
const theme = ref<'light' | 'dark'>(
  document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
);
const themeMode = ref<ThemeMode>(initialThemeMode());
const refreshMinutes = ref<number>(initialRefreshMinutes());
const settings = ref<Settings>({ baseUrl: 'https://dist.woyuxiaji.cn/api/v1' });
const loading = ref(false);
const saving = ref(false);
const updatingAll = ref(false);
const error = ref('');
const busyKeys = ref<Record<string, boolean>>({});
const progress = ref<Record<string, Progress>>({});
const settingsVisible = ref(false);
const uninstallTarget = ref<AppView | null>(null);
const deleteUninstallData = ref(false);
const draftBaseUrl = ref('');
const search = ref('');
const sortBy = ref<'recent' | 'name' | 'status'>('recent');
const gridMode = ref(true);
const menuKey = ref('');
const selectedKey = ref('');
const detailScroll = ref<HTMLElement | null>(null);
const scrollable = ref(false);
const scrollThumbHeight = ref(0);
const scrollThumbTop = ref(0);
const screenIndex = ref(0);
const showAllChanges = ref(false);
const serviceOnline = ref(true);

const installedCount = computed(() => apps.value.filter((app) => app.installed).length);
const updateCount = computed(() => apps.value.filter((app) => app.hasUpdate).length);
const platformLabel = computed(() => {
  const labels: Record<string, string> = {
    darwin: 'macOS',
    win32: 'Windows',
    android: 'Android',
    linux: 'Linux',
  };
  return labels[platform.value] ?? platform.value ?? 'DESKTOP';
});

const visibleApps = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  const list = apps.value.filter((app) => {
    if (!keyword) return true;
    return (
      app.name.toLowerCase().includes(keyword) ||
      app.appKey.toLowerCase().includes(keyword) ||
      (app.description ?? '').toLowerCase().includes(keyword)
    );
  });
  return list.sort((left, right) => {
    if (sortBy.value === 'name') return left.name.localeCompare(right.name, 'zh-CN');
    if (sortBy.value === 'status') {
      return Number(right.installed) - Number(left.installed) ||
        Number(right.hasUpdate) - Number(left.hasUpdate);
    }
    return right.latestVersionCode - left.latestVersionCode ||
      left.name.localeCompare(right.name, 'zh-CN');
  });
});

const appGroups = computed(() => {
  const installed = visibleApps.value.filter((app) => app.installed);
  const uninstalled = visibleApps.value.filter((app) => !app.installed);
  return [
    { key: 'installed', label: '已安装', apps: installed },
    { key: 'uninstalled', label: '未安装', apps: uninstalled },
  ].filter((group) => group.apps.length > 0);
});

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

const themeVars = computed<Record<string, string>>(() => {
  const app = selected.value;
  const theme = app ? appColor(app) : '#46A6C6';
  const deep = app ? shadeColor(theme, 0.3) : theme;
  return {
    '--theme': theme,
    '--theme-deep': deep,
    '--theme-soft': hexToRgba(theme, 0.26),
    '--theme-wash': hexToRgba(theme, 0.09),
    '--theme-scroll': hexToRgba(theme, 0.6),
  };
});

const selected = computed(() => apps.value.find((app) => app.appKey === selectedKey.value) ?? null);
const selectedMeta = computed<DetailMeta>(() => {
  if (!selected.value) {
    return { tagline: '', features: [], screenshots: [] };
  }
  return DETAIL_META[selected.value.appKey] ?? {
    tagline: selected.value.description || '暂无描述',
    features: [
      { title: '统一分发', description: '由 VaKao Hub 维护版本、产物与更新记录。' },
      { title: '完整性校验', description: '下载后校验 SHA-256，macOS 额外检查代码签名。' },
      { title: '持续更新', description: '启动器会检查新版本，并在本机完成安装。' },
    ],
    screenshots: [],
  };
});
const changelog = computed(() => {
  const text = selected.value?.updateLog || '';
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean);
});
const visibleChanges = computed(() =>
  showAllChanges.value ? changelog.value : changelog.value.slice(0, 6),
);
const remainingChanges = computed(() =>
  Math.max(0, changelog.value.length - 6),
);

let client: ReturnType<typeof appApi> | null = null;
let refreshTimer: number | undefined;

function api(): ReturnType<typeof appApi> {
  if (!client) client = appApi();
  return client;
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const current = await api();
    settings.value = await current.GetSettings();
    if (!settingsVisible.value) draftBaseUrl.value = settings.value.baseUrl;
    const catalog = await current.GetCatalog();
    apps.value = catalog.apps ?? [];
    platform.value = catalog.platform;
    arch.value = catalog.arch;
    hostOsVersion.value = catalog.osVersion ?? '';
    serviceOnline.value = true;
  } catch (cause) {
    error.value = (cause as Error).message;
    serviceOnline.value = false;
  } finally {
    loading.value = false;
    (window as Window & { __vakaoHideSplash?: () => void }).__vakaoHideSplash?.();
    if (!initialScrollDone) {
      initialScrollDone = true;
      void nextTick(() => {
        contentRef.value?.scrollTo({ top: 0 });
        window.setTimeout(() => contentRef.value?.scrollTo({ top: 0 }), 80);
      });
    }
  }
}

async function install(app: AppView): Promise<void> {
  if (app.running) return;
  if (!supportsOs(app)) {
    error.value = `该版本需要 macOS ${app.minOs} 或更高版本，当前系统为 ${hostOsVersion.value}`;
    return;
  }
  menuKey.value = '';
  busyKeys.value = { ...busyKeys.value, [app.appKey]: true };
  error.value = '';
  try {
    await api().Install(app.appKey, app.artifactID);
    await load();
  } catch (cause) {
    error.value = (cause as Error).message;
  } finally {
    const next = { ...busyKeys.value };
    delete next[app.appKey];
    busyKeys.value = next;
  }
}

async function updateAll(): Promise<void> {
  if (updatingAll.value) return;
  updatingAll.value = true;
  const targets = apps.value.filter((app) => app.hasUpdate && !app.running);
  for (const app of targets) {
    await install(app);
  }
  updatingAll.value = false;
}

function compareVersion(left: string, right: string): number {
  const a = left.split('.').map((part) => parseInt(part, 10) || 0);
  const b = right.split('.').map((part) => parseInt(part, 10) || 0);
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const x = a[index] ?? 0;
    const y = b[index] ?? 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

function supportsOs(app: AppView): boolean {
  if (!app.minOs || !hostOsVersion.value) return true;
  return compareVersion(hostOsVersion.value, app.minOs) >= 0;
}

async function primaryAction(app: AppView): Promise<void> {
  if (!supportsOs(app)) {
    error.value = `该版本需要 macOS ${app.minOs} 或更高版本，当前系统为 ${hostOsVersion.value}`;
    return;
  }
  if (app.running) return;
  if (!app.installed || app.hasUpdate) {
    await install(app);
  } else {
    await launch(app);
  }
}

function requestUninstall(app: AppView): void {
  if (app.running) return;
  menuKey.value = '';
  deleteUninstallData.value = false;
  uninstallTarget.value = app;
}

async function confirmUninstall(): Promise<void> {
  const app = uninstallTarget.value;
  uninstallTarget.value = null;
  if (!app) return;
  await uninstall(app, deleteUninstallData.value);
}

async function uninstall(app: AppView, deleteData: boolean): Promise<void> {
  if (app.running) return;
  menuKey.value = '';
  error.value = '';
  try {
    await api().Uninstall(app.appKey, deleteData);
    const next = { ...progress.value };
    delete next[app.appKey];
    progress.value = next;
    await load();
  } catch (cause) {
    error.value = (cause as Error).message;
  }
}

async function launch(app: AppView): Promise<void> {
  menuKey.value = '';
  error.value = '';
  try {
    await api().Launch(app.appKey);
  } catch (cause) {
    error.value = (cause as Error).message;
  }
}

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

function onDetailScroll(): void {
  updateScrollbar();
}

function resetDetailScroll(): void {
  void nextTick(() => {
    detailScroll.value?.scrollTo({ top: 0 });
    updateScrollbar();
    window.setTimeout(updateScrollbar, 240);
  });
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
    element.scrollTop = Math.min(
      maxScroll,
      Math.max(0, startScroll + (delta / maxTop) * maxScroll),
    );
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

function openDetail(app: AppView): void {
  menuKey.value = '';
  selectedKey.value = app.appKey;
  screenIndex.value = 0;
  showAllChanges.value = false;
  resetDetailScroll();
}

function closeDetail(): void {
  selectedKey.value = '';
  menuKey.value = '';
}

function moveDetail(offset: number): void {
  if (!selected.value) return;
  const list = visibleApps.value;
  const index = list.findIndex((app) => app.appKey === selected.value?.appKey);
  if (index < 0) return;
  const next = (index + offset + list.length) % list.length;
  selectedKey.value = list[next].appKey;
  screenIndex.value = 0;
  showAllChanges.value = false;
  resetDetailScroll();
}

function prevApp(): void {
  moveDetail(-1);
}

function nextApp(): void {
  moveDetail(1);
}

function prevScreen(): void {
  const count = selectedMeta.value.screenshots.length;
  if (!count) return;
  screenIndex.value = (screenIndex.value - 1 + count) % count;
}

function nextScreen(): void {
  const count = selectedMeta.value.screenshots.length;
  if (!count) return;
  screenIndex.value = (screenIndex.value + 1) % count;
}

function toggleMenu(app: AppView): void {
  menuKey.value = menuKey.value === app.appKey ? '' : app.appKey;
}

function closeMenu(): void {
  menuKey.value = '';
}

function openSettings(): void {
  draftBaseUrl.value = settings.value.baseUrl;
  settingsVisible.value = true;
}

async function saveSettings(): Promise<void> {
  saving.value = true;
  error.value = '';
  try {
    settings.value = await api().SaveSettings(draftBaseUrl.value);
    settingsVisible.value = false;
    await load();
  } catch (cause) {
    error.value = (cause as Error).message;
  } finally {
    saving.value = false;
  }
}

function reveal(app: AppView): Promise<void> {
  menuKey.value = '';
  error.value = '';
  return api().Reveal(app.appKey).catch((cause: unknown) => {
    error.value = (cause as Error).message;
  });
}

function scrollToChangelog(): void {
  menuKey.value = '';
  void nextTick(() => {
    const target = document.querySelector('.changelog');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function openUrl(url: string): void {
  menuKey.value = '';
  api().OpenURL(url);
}

function busy(appKey: string): boolean {
  return Boolean(busyKeys.value[appKey]);
}

function percentOf(appKey: string): string {
  const item = progress.value[appKey];
  if (!item || item.percent < 0) return '0%';
  return `${Math.min(100, item.percent)}%`;
}

function initial(name: string): string {
  return (name || '?').trim().charAt(0).toUpperCase();
}

function formatBytes(bytes: number): string {
  if (!bytes) return '未知大小';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`;
}

function formatDate(timestamp: number): string {
  if (!timestamp) return '—';
  const ms = timestamp > 1e12 ? timestamp : timestamp * 1000;
  return new Date(ms).toLocaleDateString('zh-CN');
}

function releaseUrl(app: AppView): string {
  if (app.releaseUrl) return app.releaseUrl;
  return `${app.repoUrl.replace(/\.git$/, '').replace(/\/$/, '')}/releases`;
}

const palette = ['#5fbedc', '#f0995f', '#a27fc2', '#eddf55'];

function hashedColor(key: string): string {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

function appColor(app: AppView): string {
  return app.themeColor || hashedColor(app.appKey);
}

function shadeColor(hex: string, amount: number): string {
  const value = hex.replace('#', '');
  const red = Math.max(0, Math.round(parseInt(value.slice(0, 2), 16) * (1 - amount)));
  const green = Math.max(0, Math.round(parseInt(value.slice(2, 4), 16) * (1 - amount)));
  const blue = Math.max(0, Math.round(parseInt(value.slice(4, 6), 16) * (1 - amount)));
  return `#${[red, green, blue].map((part) => part.toString(16).padStart(2, '0')).join('')}`;
}

function applyNativeTheme(next: 'light' | 'dark'): void {
  const runtime = (window as Window & {
    runtime?: {
      WindowSetDarkTheme?: () => void;
      WindowSetLightTheme?: () => void;
    };
  }).runtime;
  if (next === 'dark') runtime?.WindowSetDarkTheme?.();
  else runtime?.WindowSetLightTheme?.();
}

function setTheme(next: 'light' | 'dark'): void {
  theme.value = next;
  document.documentElement.dataset.theme = next;
  document.documentElement.style.colorScheme = next;
  applyNativeTheme(next);
  try {
    localStorage.setItem('vakaohub-theme', next);
  } catch {
    // localStorage 不可用时只保留本次会话的主题。
  }
}

function setThemeMode(mode: ThemeMode): void {
  themeMode.value = mode;
  try {
    localStorage.setItem('vakaohub-theme-mode', mode);
  } catch {
    // localStorage 不可用时只保留本次会话的模式。
  }
  setTheme(mode === 'system' ? systemTheme() : mode);
}

function toggleTheme(): void {
  setThemeMode(theme.value === 'dark' ? 'light' : 'dark');
}

function saveRefreshInterval(): void {
  try {
    localStorage.setItem('vakaohub-refresh-minutes', String(refreshMinutes.value));
  } catch {
    // localStorage 不可用时只保留本次会话的频率。
  }
  restartRefreshTimer();
}

function resetBaseUrl(): void {
  draftBaseUrl.value = 'https://dist.woyuxiaji.cn/api/v1';
}

function onKeydown(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key === ',') {
    event.preventDefault();
    openSettings();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'd') {
    event.preventDefault();
    toggleTheme();
    return;
  }
  if (event.key !== 'Escape') return;
  if (uninstallTarget.value) {
    uninstallTarget.value = null;
  } else if (settingsVisible.value) {
    settingsVisible.value = false;
  } else if (selectedKey.value) {
    closeDetail();
  }
}

function onProgress(payload: Progress): void {
  progress.value = { ...progress.value, [payload.appKey]: payload };
  if (payload.phase === 'error') {
    error.value = payload.message;
  }
}

let systemThemeMedia: MediaQueryList | undefined;
function onSystemThemeChange(): void {
  if (themeMode.value === 'system') setTheme(systemTheme());
}

function restartRefreshTimer(): void {
  if (refreshTimer) window.clearInterval(refreshTimer);
  refreshTimer = undefined;
  if (refreshMinutes.value <= 0) return;
  refreshTimer = window.setInterval(() => {
    if (!document.hidden && !loading.value) {
      void load();
    }
  }, refreshMinutes.value * 60 * 1000);
}

onMounted(() => {
  const mode = initialThemeMode();
  themeMode.value = mode;
  setTheme(mode === 'system' ? systemTheme() : mode);
  document.documentElement.style.colorScheme = theme.value;
  void load();
  window.addEventListener('click', closeMenu);
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', updateScrollbar);
  const runtime = (window as unknown as {
    runtime?: {
      EventsOn(name: string, callback: (payload: Progress) => void): void;
      EventsOff(name: string): void;
    };
  }).runtime;
  runtime?.EventsOn('install:progress', onProgress);

  restartRefreshTimer();

  systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
  systemThemeMedia.addEventListener('change', onSystemThemeChange);
});

onUnmounted(() => {
  if (refreshTimer) window.clearInterval(refreshTimer);
  systemThemeMedia?.removeEventListener('change', onSystemThemeChange);
  window.removeEventListener('click', closeMenu);
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('resize', updateScrollbar);
  const runtime = (window as unknown as {
    runtime?: { EventsOff(name: string): void };
  }).runtime;
  runtime?.EventsOff('install:progress');
});
</script>
