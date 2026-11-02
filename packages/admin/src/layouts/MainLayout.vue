<template>
  <n-layout has-sider style="height: 100vh">
    <n-layout-sider bordered width="220" :native-scrollbar="false">
      <div class="brand">
        <span class="brand-dot" />
        <span>VaKao Hub</span>
      </div>
      <n-menu
        :value="activeKey"
        :options="menuOptions"
        @update:value="onMenuSelect"
      />
    </n-layout-sider>

    <n-layout>
      <n-layout-header bordered class="header">
        <span class="muted">{{ username }}</span>
        <n-button size="small" quaternary @click="openPassword">修改密码</n-button>
        <n-button size="small" quaternary @click="logout">退出登录</n-button>
      </n-layout-header>
      <n-layout-content content-style="padding: 0">
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>

  <n-modal
    v-model:show="passwordVisible"
    preset="card"
    title="修改管理员密码"
    style="width: 420px"
  >
    <n-form label-placement="left" label-width="80">
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
      <div style="display: flex; justify-content: flex-end; gap: 10px">
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
  NLayout,
  NLayoutContent,
  NLayoutHeader,
  NLayoutSider,
  NMenu,
  NModal,
  useMessage,
} from 'naive-ui';
import type { MenuOption } from 'naive-ui';
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const username = localStorage.getItem('hub_username') ?? 'admin';

const menuOptions: MenuOption[] = [
  { label: '总览', key: '/dashboard' },
  { label: '应用管理', key: '/apps' },
  { label: '版本与产物', key: '/releases' },
  { label: '事件日志', key: '/events' },
  { label: '操作审计', key: '/audit' },
];

const activeKey = computed(() => route.path);

const passwordVisible = ref(false);
const savingPassword = ref(false);
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

function onMenuSelect(key: string): void {
  void router.push(key);
}

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
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px 20px 14px;
  font-weight: 600;
  font-size: 16px;
}

.brand-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: linear-gradient(135deg, #46a6c6, #a27fc2);
}

.header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  height: 52px;
  padding: 0 20px;
}
</style>
