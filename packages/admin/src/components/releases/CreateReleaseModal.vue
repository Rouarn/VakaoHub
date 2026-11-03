<template>
  <n-modal :show="show" preset="card" title="新建版本" style="width: 600px" @update:show="$emit('update:show', $event)">
    <n-form label-placement="top" :show-feedback="false">
      <div class="create-grid">
        <n-form-item label="版本名称">
          <div class="create-field">
            <n-input v-model:value="form.versionName" placeholder="如 1.0.1" />
            <span class="create-hint">展示给用户的版本，例如 1.0.1。</span>
          </div>
        </n-form-item>
        <n-form-item label="构建号（versionCode）">
          <div class="create-field">
            <n-input-number v-model:value="form.versionCode" :min="1" :precision="0" style="width: 100%" />
            <span class="create-hint">必须大于当前最新构建号 {{ maxVersionCode }}，决定升级顺序。</span>
          </div>
        </n-form-item>
      </div>

      <div class="create-grid">
        <n-form-item label="发布通道">
          <n-select v-model:value="form.channel" :options="channelOptions" />
        </n-form-item>
        <n-form-item label="最低可更新构建号">
          <div class="create-field">
            <n-input-number v-model:value="form.minVersionCode" :min="0" :precision="0" style="width: 100%" />
            <span class="create-hint">已安装版本低于此构建号时不提示更新；0 表示不限制。</span>
          </div>
        </n-form-item>
      </div>

      <n-form-item label="更新说明">
        <n-input v-model:value="form.updateLog" type="textarea" placeholder="这一版改了什么" :autosize="{ minRows: 3, maxRows: 6 }" />
      </n-form-item>
    </n-form>
    <template #footer>
      <div style="display: flex; justify-content: flex-end; gap: 10px">
        <n-button @click="$emit('update:show', false)">取消</n-button>
        <n-button type="primary" :loading="saving" @click="save">创建</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { NButton, NForm, NFormItem, NInput, NInputNumber, NModal, NSelect, useMessage } from 'naive-ui';
import type { SelectOption } from 'naive-ui';
import { reactive, ref, watch } from 'vue';
import { api } from '@/api';

const props = defineProps<{
  show: boolean;
  appId: number | null;
  maxVersionCode: number;
}>();

const emit = defineEmits<{
  'update:show': [value: boolean];
  saved: [];
}>();

const message = useMessage();
const saving = ref(false);
const form = reactive({
  versionName: '',
  versionCode: 1,
  channel: 'stable',
  minVersionCode: 0,
  updateLog: '',
});

const channelOptions: SelectOption[] = [
  { label: '稳定版（stable）', value: 'stable' },
  { label: '测试版（beta）', value: 'beta' },
];

watch(
  () => props.show,
  (visible) => {
    if (!visible) return;
    form.versionName = '';
    form.versionCode = props.maxVersionCode + 1;
    form.channel = 'stable';
    form.minVersionCode = 0;
    form.updateLog = '';
  },
  { immediate: true },
);

async function save(): Promise<void> {
  if (!props.appId) return;
  if (!form.versionName || !form.versionCode) {
    message.warning('请填写版本名称与构建号');
    return;
  }
  if (form.versionCode <= props.maxVersionCode) {
    message.warning(`构建号必须大于当前最新构建号 ${props.maxVersionCode}`);
    return;
  }
  saving.value = true;
  try {
    await api.releases.create({
      appId: props.appId,
      versionName: form.versionName,
      versionCode: form.versionCode,
      channel: form.channel,
      minVersionCode: form.minVersionCode,
      updateLog: form.updateLog || undefined,
    });
    message.success('已创建草稿版本');
    emit('update:show', false);
    emit('saved');
  } catch (error) {
    message.error((error as Error).message);
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.create-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 12px;
}

.create-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
}

.create-hint {
  color: var(--faint);
  font-size: 10px;
  line-height: 1.45;
}

@media (max-width: 640px) {
  .create-grid { grid-template-columns: 1fr; }
}
</style>
