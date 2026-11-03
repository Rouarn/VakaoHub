<template>
  <n-modal :show="show" preset="card" :title="editing ? '编辑应用' : '新建应用'" style="width: 520px" @update:show="$emit('update:show', $event)">
    <n-form label-placement="left" label-width="90">
      <n-form-item label="appKey">
        <n-input v-model:value="form.appKey" :disabled="Boolean(editing)" placeholder="wiredeck" />
      </n-form-item>
      <n-form-item label="名称">
        <n-input v-model:value="form.name" placeholder="WireDeck" />
      </n-form-item>
      <n-form-item label="分类">
        <n-input v-model:value="form.category" placeholder="desktop / mobile / tool" />
      </n-form-item>
      <n-form-item label="图标 URL">
        <n-input v-model:value="form.iconUrl" placeholder="https://..." />
      </n-form-item>
      <n-form-item label="仓库">
        <n-input v-model:value="form.repoUrl" placeholder="https://github.com/..." />
      </n-form-item>
      <n-form-item label="主页">
        <n-input v-model:value="form.homepage" placeholder="https://..." />
      </n-form-item>
      <n-form-item label="帮助文档">
        <n-input v-model:value="form.docsUrl" placeholder="https://.../docs" />
      </n-form-item>
      <n-form-item label="版本发布">
        <n-input v-model:value="form.releaseUrl" placeholder="https://github.com/.../releases" />
      </n-form-item>
      <n-form-item label="主题色">
        <div style="display: flex; align-items: center; gap: 8px">
          <n-color-picker
            :value="form.themeColor"
            :show-alpha="false"
            :modes="['hex']"
            :swatches="themeSwatches"
            style="width: 180px; flex: none"
            @update:value="onThemeColorChange"
          />
          <n-button size="tiny" :type="themeAuto ? 'primary' : 'default'" :disabled="themeAuto" @click="useAutoTheme">
            {{ themeAuto ? '自动中' : '自动' }}
          </n-button>
          <span class="theme-hint">
            {{ themeAuto ? `按 appKey 自动生成 ${form.themeColor}` : '自定义颜色' }}
          </span>
        </div>
      </n-form-item>
      <n-form-item label="描述">
        <n-input v-model:value="form.description" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" />
      </n-form-item>
    </n-form>
    <template #footer>
      <div style="display: flex; justify-content: flex-end; gap: 10px">
        <n-button @click="$emit('update:show', false)">取消</n-button>
        <n-button type="primary" :loading="saving" @click="save">保存</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { NButton, NColorPicker, NForm, NFormItem, NInput, NModal, useMessage } from 'naive-ui';
import { reactive, ref, watch } from 'vue';
import { api } from '@/api';
import type { AppRow } from '@/api/types';

const props = defineProps<{
  show: boolean;
  editing: AppRow | null;
}>();

const emit = defineEmits<{
  'update:show': [value: boolean];
  saved: [];
}>();

const message = useMessage();
const saving = ref(false);
const themeAuto = ref(true);
const themeSwatches = ['#5FBEDC', '#F0995F', '#A27FC2', '#EDDF55', '#D5B84A', '#171512'];
const autoPalette = ['#5FBEDC', '#F0995F', '#A27FC2', '#EDDF55'];

const form = reactive({
  appKey: '',
  name: '',
  category: '',
  iconUrl: '',
  repoUrl: '',
  homepage: '',
  docsUrl: '',
  releaseUrl: '',
  themeColor: '',
  description: '',
});

function autoColorForKey(key: string): string {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return autoPalette[hash % autoPalette.length];
}

function onThemeColorChange(value: string | null): void {
  if (!value) {
    useAutoTheme();
    return;
  }
  themeAuto.value = false;
  form.themeColor = value;
}

function useAutoTheme(): void {
  themeAuto.value = true;
  form.themeColor = autoColorForKey(form.appKey);
}

function fill(row: AppRow | null): void {
  form.appKey = row?.appKey ?? '';
  form.name = row?.name ?? '';
  form.category = row?.category ?? '';
  form.iconUrl = row?.iconUrl ?? '';
  form.repoUrl = row?.repoUrl ?? '';
  form.homepage = row?.homepage ?? '';
  form.docsUrl = row?.docsUrl ?? '';
  form.releaseUrl = row?.releaseUrl ?? '';
  themeAuto.value = !row?.themeColor;
  form.themeColor = row?.themeColor ?? autoColorForKey(row?.appKey ?? '');
  form.description = row?.description ?? '';
}

watch(
  () => [props.show, props.editing] as const,
  ([visible]) => {
    if (visible) fill(props.editing);
  },
  { immediate: true },
);

watch(
  () => form.appKey,
  (key: string) => {
    if (themeAuto.value) form.themeColor = autoColorForKey(key);
  },
);

async function save(): Promise<void> {
  if (!form.appKey || !form.name) {
    message.warning('appKey 与名称必填');
    return;
  }
  saving.value = true;
  try {
    const payload = {
      appKey: form.appKey,
      name: form.name,
      category: form.category || undefined,
      iconUrl: form.iconUrl || undefined,
      repoUrl: form.repoUrl || undefined,
      homepage: form.homepage || undefined,
      docsUrl: form.docsUrl || undefined,
      releaseUrl: form.releaseUrl || undefined,
      themeColor: themeAuto.value ? null : form.themeColor || null,
      description: form.description || undefined,
    };
    if (props.editing) {
      await api.apps.update(props.editing.id, payload);
      message.success('已更新');
    } else {
      await api.apps.create(payload);
      message.success('已创建');
    }
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
.theme-hint {
  color: var(--faint);
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.02em;
}
</style>
