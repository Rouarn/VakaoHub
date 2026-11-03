<template>
  <n-modal :show="show" preset="card" title="发布版本" style="width: 480px" @update:show="$emit('update:show', $event)">
    <p v-if="target" class="muted">
      {{ target.versionName }}（versionCode {{ target.versionCode }}）
    </p>
    <n-radio-group v-model:value="form.mode">
      <n-space vertical>
        <n-radio value="full">全量发布</n-radio>
        <n-radio value="gray">灰度发布</n-radio>
      </n-space>
    </n-radio-group>
    <n-form-item v-if="form.mode === 'gray'" label="灰度比例" style="margin-top: 14px">
      <n-input-number v-model:value="form.grayPercent" :min="1" :max="99" style="width: 100%" />
    </n-form-item>
    <template #footer>
      <div style="display: flex; justify-content: flex-end; gap: 10px">
        <n-button @click="$emit('update:show', false)">取消</n-button>
        <n-button type="primary" :loading="saving" @click="publish">发布</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { NButton, NFormItem, NInputNumber, NModal, NRadio, NRadioGroup, NSpace, useMessage } from 'naive-ui';
import { reactive, ref, watch } from 'vue';
import { api } from '@/api';
import type { ReleaseRow } from '@/api/types';

const props = defineProps<{
  show: boolean;
  target: ReleaseRow | null;
}>();

const emit = defineEmits<{
  'update:show': [value: boolean];
  saved: [];
}>();

const message = useMessage();
const saving = ref(false);
const form = reactive({
  mode: 'full' as 'full' | 'gray',
  grayPercent: 10,
});

watch(
  () => props.show,
  (visible) => {
    if (!visible) return;
    form.mode = 'full';
    form.grayPercent = 10;
  },
);

async function publish(): Promise<void> {
  if (!props.target) return;
  saving.value = true;
  try {
    await api.releases.publish(props.target.id, {
      mode: form.mode,
      grayPercent: form.mode === 'gray' ? form.grayPercent : undefined,
    });
    message.success('已发布');
    emit('update:show', false);
    emit('saved');
  } catch (error) {
    message.error((error as Error).message);
  } finally {
    saving.value = false;
  }
}
</script>
