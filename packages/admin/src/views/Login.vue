<template>
  <div class="login-wrap">
    <n-card class="login-card" title="VaKao 软件中心">
      <p class="muted" style="margin-top: 0; margin-bottom: 18px">
        管理后台 · 请使用管理员账号登录
      </p>
      <n-form @submit.prevent="submit">
        <n-form-item label="用户名">
          <n-input v-model:value="form.username" placeholder="admin" />
        </n-form-item>
        <n-form-item label="密码">
          <n-input
            v-model:value="form.password"
            type="password"
            show-password-on="click"
            placeholder="请输入密码"
          />
        </n-form-item>
        <n-button
          type="primary"
          block
          :loading="loading"
          attr-type="submit"
          @click="submit"
        >
          登录
        </n-button>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { NButton, NCard, NForm, NFormItem, NInput, useMessage } from 'naive-ui';
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api';

const router = useRouter();
const message = useMessage();

const form = reactive({ username: 'admin', password: '' });
const loading = ref(false);

async function submit(): Promise<void> {
  if (!form.username || !form.password) {
    message.warning('请输入用户名与密码');
    return;
  }
  loading.value = true;
  try {
    const result = await api.login(form.username, form.password);
    localStorage.setItem('hub_token', result.accessToken);
    localStorage.setItem('hub_username', result.username);
    message.success('登录成功');
    await router.replace('/dashboard');
  } catch (error) {
    message.error((error as Error).message);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: radial-gradient(circle at 20% 20%, #e7f4f8, #f5f6f8 60%);
}

.login-card {
  width: 380px;
}
</style>
