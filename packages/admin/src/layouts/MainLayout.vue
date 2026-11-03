<template>
  <div class="admin-shell">
    <AdminSidebar :active-key="activeKey" :username="username" :initial="initial" @navigate="router.push" />

    <div class="content-wrap">
      <AdminTopbar :title="currentTitle" @open-password="passwordVisible = true" @logout="logout" />
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>

  <PasswordModal v-model:show="passwordVisible" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AdminSidebar from '@/components/layout/AdminSidebar.vue';
import AdminTopbar from '@/components/layout/AdminTopbar.vue';
import PasswordModal from '@/components/layout/PasswordModal.vue';

const route = useRoute();
const router = useRouter();
const username = localStorage.getItem('hub_username') ?? 'admin';
const initial = username.slice(0, 1).toUpperCase();

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

function logout(): void {
  localStorage.removeItem('hub_token');
  localStorage.removeItem('hub_username');
  void router.replace('/login');
}
</script>
