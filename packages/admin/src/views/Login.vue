<template>
  <div class="login-shell">
    <section class="login-visual">
      <div class="visual-inner">
        <div class="visual-brand">
          <img :src="starUrl" alt="" />
          <span>VaKao Hub</span>
        </div>

        <p class="hud">ADMIN / CONSOLE</p>
        <h1>软件分发<br /><em>工作台。</em></h1>
        <p class="visual-lede">
          版本、灰度、事件与审计，<br />
          在一个安静的控制台里。
        </p>

        <div class="visual-bars" aria-hidden="true">
          <span style="--c: var(--orange); --w: 82%"></span>
          <span style="--c: var(--blue); --w: 64%"></span>
          <span style="--c: var(--purple); --w: 46%"></span>
          <span style="--c: var(--yellow); --w: 28%"></span>
        </div>

        <div class="visual-foot">
          <span class="hud">VERSION / 0.1</span>
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
  height: 100vh;
  background: var(--paper);
}

.login-visual {
  position: relative;
  display: flex;
  align-items: center;
  padding: 56px;
  background: var(--ink);
  color: #f2efe7;
  overflow: hidden;
}

.login-visual::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(242, 239, 231, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(242, 239, 231, 0.05) 1px, transparent 1px);
  background-size: 56px 56px;
  pointer-events: none;
}

.visual-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 520px;
  height: 100%;
  padding-bottom: 8px;
}

.visual-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: auto;
  font-family: var(--display);
  font-size: 15px;
  font-weight: 700;
}

.visual-brand img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.login-visual .hud {
  color: rgba(242, 239, 231, 0.34);
}

.login-visual h1 {
  margin: 18px 0 18px;
  font-family: var(--display);
  font-size: clamp(46px, 5vw, 72px);
  line-height: 0.96;
  letter-spacing: -0.045em;
  font-weight: 780;
}

.login-visual h1 em {
  font-family: var(--serif);
  font-style: italic;
  font-weight: 400;
  color: var(--blue);
  letter-spacing: -0.02em;
}

.visual-lede {
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  color: rgba(242, 239, 231, 0.58);
}

.visual-bars {
  display: grid;
  gap: 7px;
  margin-top: 34px;
  max-width: 300px;
}

.visual-bars span {
  display: block;
  width: var(--w);
  height: 3px;
  border-radius: 2px;
  background: var(--c);
  opacity: 0.85;
}

.visual-foot {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-top: auto;
  padding-top: 28px;
  border-top: 1px solid rgba(242, 239, 231, 0.12);
}

.login-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  background-image:
    linear-gradient(rgba(23, 21, 18, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(23, 21, 18, 0.03) 1px, transparent 1px);
  background-size: 56px 56px;
}

.login-box {
  width: 100%;
  max-width: 360px;
}

.login-box .hud {
  color: var(--accent);
}

.login-box h2 {
  margin: 12px 0 6px;
  font-family: var(--display);
  font-size: 30px;
  letter-spacing: -0.035em;
}

.login-hint {
  margin: 0 0 26px;
  color: var(--muted);
  font-size: 12px;
}

.login-box :deep(.n-form-item-label) {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
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
  margin-top: 34px;
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
    padding: 28px;
  }
}
</style>
