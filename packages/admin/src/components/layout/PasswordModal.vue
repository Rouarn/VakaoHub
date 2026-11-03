<template>
  <n-modal :show="show" preset="card" title="修改管理员密码" style="width: 420px" @update:show="$emit('update:show', $event)">
    <n-form label-placement="top">
      <n-form-item label="原密码">
        <n-input v-model:value="form.oldPassword" type="password" show-password-on="click" />
      </n-form-item>
      <n-form-item label="新密码">
        <n-input v-model:value="form.newPassword" type="password" show-password-on="click" placeholder="至少 8 位" />
      </n-form-item>
      <n-form-item label="确认密码">
        <n-input v-model:value="form.confirmPassword" type="password" show-password-on="click" />
      </n-form-item>
    </n-form>
    <template #footer>
      <div style="display: flex; justify-content: flex-end; gap: 8px">
        <n-button @click="$emit('update:show', false)">取消</n-button>
        <n-button type="primary" :loading="saving" @click="submit">保存并重新登录</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { NButton, NForm, NFormItem, NInput, NModal, useMessage } from 'naive-ui';
import { reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api';

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{ 'update:show': [value: boolean] }>();

const router = useRouter();
const message = useMessage();
const saving = ref(false);
const form = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' });

watch(
  () => props.show,
  (visible) => {
    if (visible) reset();
  },
);

function reset(): void {
  form.oldPassword = '';
  form.newPassword = '';
  form.confirmPassword = '';
}

async function submit(): Promise<void> {
  if (!form.oldPassword || !form.newPassword) {
    message.warning('请填写原密码与新密码');
    return;
  }
  if (form.newPassword.length < 8) {
    message.warning('新密码至少 8 位');
    return;
  }
  if (form.newPassword !== form.confirmPassword) {
    message.warning('两次输入的新密码不一致');
    return;
  }
  saving.value = true;
  try {
    await api.changePassword(form.oldPassword, form.newPassword);
    message.success('密码已修改，请重新登录');
    emit('update:show', false);
    reset();
    localStorage.removeItem('hub_token');
    localStorage.removeItem('hub_username');
    await router.replace('/login');
  } catch (error) {
    message.error((error as Error).message);
  } finally {
    saving.value = false;
  }
}
</script>
