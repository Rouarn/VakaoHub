<template>
  <div class="admin-shell">
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
            @click="router.push(item.key)"
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

    <div class="content-wrap">
      <header class="topbar">
        <div class="topbar-title">
          <p class="hud">VAKAO / ADMIN</p>
          <strong>{{ currentTitle }}</strong>
        </div>
        <div class="topbar-actions">
          <span class="live"><i></i>LIVE</span>
          <button class="text-btn" @click="openPassword">修改密码</button>
          <button class="text-btn" @click="logout">退出</button>
        </div>
      </header>

      <main class="content">
        <router-view />
      </main>
    </div>
  </div>

  <n-modal
    v-model:show="passwordVisible"
    preset="card"
    title="修改管理员密码"
    style="width: 420px"
  >
    <n-form label-placement="top">
      <n-form-item label="原密码">
        <n-input
          v-model:value="passwordForm.oldPassword"
          type="password"
          show-password-on="click"
        />
      </n-form-item>
      <n-form-item label="新密码">
        <n-input
          v-model:value="passwordForm.newPassword"
          type="password"
          show-password-on="click"
          placeholder="至少 8 位"
        />
      </n-form-item>
      <n-form-item label="确认密码">
        <n-input
          v-model:value="passwordForm.confirmPassword"
          type="password"
          show-password-on="click"
        />
      </n-form-item>
    </n-form>
    <template #footer>
      <div style="display: flex; justify-content: flex-end; gap: 8px">
        <n-button @click="passwordVisible = false">取消</n-button>
        <n-button type="primary" :loading="savingPassword" @click="submitPassword">
          保存并重新登录
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NModal,
  useMessage,
} from 'naive-ui';
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api';
import starUrl from '@/assets/star.png';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const username = localStorage.getItem('hub_username') ?? 'admin';
const initial = username.slice(0, 1).toUpperCase();

const groups = [
  {
    title: '概览',
    items: [
      {
        key: '/dashboard',
        label: '总览',
        icon: 'M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z',
      },
    ],
  },
  {
    title: '内容',
    items: [
      {
        key: '/apps',
        label: '应用管理',
        icon: 'M4 7.5h16v12H4zM8 7.5V5h8v2.5M4 12h16',
      },
      {
        key: '/releases',
        label: '版本与产物',
        icon: 'M12 3l8.5 4.5L12 12 3.5 7.5 12 3zM3.5 12L12 16.5 20.5 12M3.5 16.5L12 21l8.5-4.5',
      },
    ],
  },
  {
    title: '监控',
    items: [
      {
        key: '/events',
        label: '事件日志',
        icon: 'M3 12h4l2-6 4 12 2-6h6',
      },
      {
        key: '/audit',
        label: '操作审计',
        icon: 'M12 3l7.5 3v5.5c0 4.8-3.2 7.8-7.5 9-4.3-1.2-7.5-4.2-7.5-9V6L12 3zM9 12l2 2 4-4',
      },
    ],
  },
];

const titles: Record<string, string> = {
  '/dashboard': '运行概览',
  '/apps': '应用管理',
  '/releases': '版本与产物',
  '/events': '事件日志',
  '/audit': '操作审计',
};

const activeKey = computed(() => route.path);
const currentTitle = computed(() => titles[route.path] ?? '管理后台');

const passwordVisible = ref(false);
const savingPassword = ref(false);
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

function openPassword(): void {
  passwordForm.oldPassword = '';
  passwordForm.newPassword = '';
  passwordForm.confirmPassword = '';
  passwordVisible.value = true;
}

async function submitPassword(): Promise<void> {
  if (!passwordForm.oldPassword || !passwordForm.newPassword) {
    message.warning('请填写原密码与新密码');
    return;
  }
  if (passwordForm.newPassword.length < 8) {
    message.warning('新密码至少 8 位');
    return;
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    message.warning('两次输入的新密码不一致');
    return;
  }

  savingPassword.value = true;
  try {
    await api.changePassword(passwordForm.oldPassword, passwordForm.newPassword);
    message.success('密码已修改，请重新登录');
    passwordVisible.value = false;
    localStorage.removeItem('hub_token');
    localStorage.removeItem('hub_username');
    await router.replace('/login');
  } catch (error) {
    message.error((error as Error).message);
  } finally {
    savingPassword.value = false;
  }
}

function logout(): void {
  localStorage.removeItem('hub_token');
  localStorage.removeItem('hub_username');
  void router.replace('/login');
}
</script>

<style scoped>
.admin-shell {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  height: 100vh;
  background: var(--paper);
}

.side {
  display: flex;
  flex-direction: column;
  padding: 22px 14px 18px;
  background: #0f1115;
  color: #f4f5f7;
}

.side-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px 20px;
  border-bottom: 1px solid rgba(242, 239, 231, 0.12);
}

.side-star {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.side-brand strong {
  display: block;
  font-family: var(--display);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.side-brand span {
  display: block;
  margin-top: 3px;
  font-family: var(--body);
  font-size: 9px;
  letter-spacing: 0.06em;
  color: rgba(244, 245, 247, 0.38);
}

.side-nav {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 22px 0;
  overflow-y: auto;
}

.nav-group .hud {
  padding: 0 10px;
  margin-bottom: 6px;
  font-size: 9px;
  letter-spacing: 0.08em;
  color: rgba(244, 245, 247, 0.32);
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 9px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: rgba(244, 245, 247, 0.6);
  font-size: 12px;
  text-align: left;
  transition: background 0.16s ease, color 0.16s ease;
}

.nav-item:hover {
  color: #f4f5f7;
  background: rgba(255, 255, 255, 0.055);
}

.nav-item.active {
  background: rgba(79, 124, 247, 0.16);
  color: #ffffff;
}

.nav-icon {
  width: 16px;
  height: 16px;
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.55;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.72;
}

.nav-item.active .nav-icon {
  opacity: 1;
  color: #8ea8ff;
}

.nav-label {
  flex: 1;
}

.nav-mark {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: transparent;
}

.nav-item.active .nav-mark {
  background: #8ea8ff;
}

.side-foot {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px 8px 0;
  border-top: 1px solid rgba(242, 239, 231, 0.12);
}

.side-status {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(244, 245, 247, 0.38);
}

.side-status i,
.live i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--blue);
  box-shadow: 0 0 0 3px rgba(95, 190, 220, 0.14);
}

.side-user {
  display: flex;
  align-items: center;
  gap: 9px;
}

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: #f4f5f7;
  font-family: var(--display);
  font-size: 12px;
  font-weight: 700;
}

.side-user strong {
  display: block;
  font-size: 11px;
}

.side-user span:last-child {
  display: block;
  font-family: var(--mono);
  font-size: 8px;
  color: rgba(244, 245, 247, 0.35);
}

.content-wrap {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  height: 64px;
  padding: 0 28px;
  border-bottom: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(12px);
  flex: none;
}

.topbar-title {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.topbar-title .hud {
  font-size: 8px;
}

.topbar-title strong {
  font-family: var(--body);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.015em;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.live {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.12em;
  color: var(--faint);
}

.text-btn {
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 11px;
}

.text-btn:hover {
  color: var(--ink);
}

.content {
  flex: 1;
  overflow-y: auto;
  background: #f6f7f9;
}

@media (max-width: 900px) {
  .admin-shell {
    grid-template-columns: 210px minmax(0, 1fr);
  }

  .topbar {
    padding: 0 20px;
  }

  .topbar-title .hud {
    display: none;
  }
}
</style>
