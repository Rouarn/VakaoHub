<template>
  <div class="login-shell">
    <section class="login-visual">
      <div class="visual-glow one"></div>
      <div class="visual-glow two"></div>

      <div class="visual-inner">
        <div class="visual-brand">
          <img :src="starUrl" alt="" />
          <span>VaKao Hub</span>
          <b>ADMIN</b>
        </div>

        <div class="visual-copy">
          <p class="hud">VAKAO / DISTRIBUTION</p>
          <h1>把发布，<br /><span>变得简单。</span></h1>
          <p class="visual-lede">
            版本、产物、灰度与审计，<br />
            在一个安静的控制台里完成。
          </p>
        </div>

        <div class="visual-cards">
          <div>
            <span>01</span>
            <strong>一个目录</strong>
            <small>版本、产物与发布状态</small>
          </div>
          <div>
            <span>02</span>
            <strong>可追溯</strong>
            <small>灰度、强更、回滚与审计</small>
          </div>
        </div>

        <div class="visual-foot">
          <span class="hud">VERSION / 1.0</span>
          <span class="hud">EDGEONE · NODE 24</span>
        </div>
      </div>
    </section>

    <section class="login-panel">
      <div class="login-box">
        <p class="hud">SECURE ACCESS</p>
        <h2>登录管理后台</h2>
        <p class="login-hint">使用管理员账号继续。</p>

        <n-form label-placement="top" @submit.prevent="submit">
          <n-form-item label="用户名">
            <n-input v-model:value="form.username" placeholder="admin" size="large" />
          </n-form-item>
          <n-form-item label="密码">
            <n-input
              v-model:value="form.password"
              type="password"
              show-password-on="click"
              placeholder="请输入密码"
              size="large"
            />
          </n-form-item>
          <n-button
            type="primary"
            block
            size="large"
            :loading="loading"
            attr-type="submit"
            @click="submit"
          >
            登录
          </n-button>
        </n-form>

        <div class="login-meta">
          <span class="hud">VAKAO DISTRIBUTION</span>
          <a href="https://dist.woyuxiaji.cn" target="_blank" rel="noreferrer">返回下载页</a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { NButton, NForm, NFormItem, NInput, useMessage } from 'naive-ui';
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api';
import starUrl from '@/assets/star.png';

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
.login-shell {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  min-height: 100vh;
  background: #f6f7f9;
}

.login-visual {
  position: relative;
  display: flex;
  align-items: center;
  overflow: hidden;
  padding: 56px;
  background: #0f1115;
  color: #f4f5f7;
}

.visual-glow {
  position: absolute;
  width: 460px;
  height: 460px;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.28;
  pointer-events: none;
}

.visual-glow.one {
  top: -140px;
  left: -120px;
  background: #4f7cf7;
}

.visual-glow.two {
  right: -160px;
  bottom: -160px;
  background: #a27fc2;
}

.visual-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 520px;
  height: 100%;
  min-height: 620px;
}

.visual-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  font-family: var(--body);
  font-size: 14px;
  font-weight: 650;
  letter-spacing: -0.015em;
}

.visual-brand img {
  width: 26px;
  height: 26px;
  object-fit: contain;
}

.visual-brand b {
  margin-left: 4px;
  padding: 2px 6px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 8px;
  font-weight: 500;
  letter-spacing: 0.08em;
}

.visual-copy {
  margin: auto 0;
}

.login-visual .hud {
  color: rgba(244, 245, 247, 0.4);
}

.visual-copy h1 {
  margin: 18px 0 18px;
  font-family: var(--body);
  font-size: clamp(42px, 4.6vw, 64px);
  line-height: 1.02;
  letter-spacing: -0.04em;
  font-weight: 700;
}

.visual-copy h1 span {
  background: linear-gradient(100deg, #8ea8ff, #6fd3e8 60%, #bca4e8);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.visual-lede {
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  color: rgba(244, 245, 247, 0.6);
}

.visual-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 34px;
}

.visual-cards > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.045);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
}

.visual-cards span {
  font-family: var(--mono);
  font-size: 9px;
  color: #8ea8ff;
}

.visual-cards strong {
  margin-top: 5px;
  font-size: 13px;
  font-weight: 600;
}

.visual-cards small {
  color: rgba(244, 245, 247, 0.45);
  font-size: 10px;
}

.visual-foot {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-top: 34px;
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.visual-foot .hud {
  color: rgba(244, 245, 247, 0.3);
}

.login-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  background: #f6f7f9;
}

.login-box {
  width: 100%;
  max-width: 388px;
  padding: 30px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 18px 50px rgba(16, 24, 40, 0.07);
}

.login-box .hud {
  color: var(--accent);
}

.login-box h2 {
  margin: 10px 0 6px;
  font-family: var(--body);
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.login-hint {
  margin: 0 0 24px;
  color: var(--muted);
  font-size: 12px;
}

.login-box :deep(.n-form-item-label) {
  font-family: var(--body);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.03em;
  color: var(--faint);
}

.login-box :deep(.n-button) {
  margin-top: 8px;
}

.login-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 26px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

.login-meta .hud {
  color: var(--faint);
}

.login-meta a {
  font-size: 11px;
  color: var(--muted);
  text-decoration: none;
}

.login-meta a:hover {
  color: var(--ink);
}

@media (max-width: 900px) {
  .login-shell {
    grid-template-columns: 1fr;
  }

  .login-visual {
    display: none;
  }

  .login-panel {
    padding: 24px;
  }
}
</style>
