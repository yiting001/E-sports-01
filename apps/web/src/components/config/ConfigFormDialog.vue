<script setup lang="ts">
import { ConfigValueType } from '@app/contracts';
import { CircleCheckFilled, Lock } from '@element-plus/icons-vue';
import { computed, defineAsyncComponent } from 'vue';
import type { ConfigFormModel } from './config-ui';
import { CONFIG_GROUP_META, CONFIG_TYPE_META } from './config-ui';

const RichTextEditor = defineAsyncComponent(
  () => import('@/components/common/RichTextEditor.vue'),
);
const ImageUploader = defineAsyncComponent(
  () => import('@/components/common/ImageUploader.vue'),
);

const props = defineProps<{
  modelValue: boolean;
  form: ConfigFormModel;
  isEdit: boolean;
  valueTypes: ConfigValueType[];
  groups: ConfigFormModel['group'][];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:form': [value: ConfigFormModel];
  submit: [];
}>();

const dialogWidth = computed(() =>
  props.form.type === ConfigValueType.RichText ? '760px' : '520px',
);

function updateForm(patch: Partial<ConfigFormModel>): void {
  emit('update:form', { ...props.form, ...patch });
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="isEdit ? '编辑配置' : '新增配置'"
    :width="dialogWidth"
    class="config-dialog"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <div class="config-dialog__intro">
      <el-icon>
        <Lock v-if="form.secret" />
        <CircleCheckFilled v-else />
      </el-icon>
      <span>{{ form.secret ? '敏感配置不会在列表中明文回显。' : '配置保存后服务端会统一处理缓存失效。' }}</span>
    </div>
    <el-form label-width="84px">
      <el-form-item label="配置键">
        <el-input
          :model-value="form.key"
          :disabled="isEdit"
          placeholder="如 upload.driver"
          @update:model-value="(value: string) => updateForm({ key: value.trim() })"
        />
      </el-form-item>
      <el-form-item label="配置值">
        <RichTextEditor
          v-if="form.type === ConfigValueType.RichText"
          :model-value="form.value"
          @update:model-value="(value: string) => updateForm({ value })"
        />
        <ImageUploader
          v-else-if="form.type === ConfigValueType.Image"
          :model-value="form.value"
          @update:model-value="(value: string) => updateForm({ value })"
        />
        <el-input
          v-else
          :model-value="form.value"
          :placeholder="isEdit && form.secret ? '敏感项原值不回显，留空将清空' : ''"
          @update:model-value="(value: string) => updateForm({ value })"
        />
      </el-form-item>
      <el-form-item label="类型">
        <el-select
          :model-value="form.type"
          @update:model-value="(value: ConfigValueType) => updateForm({ type: value })"
        >
          <el-option
            v-for="type in valueTypes"
            :key="type"
            :label="CONFIG_TYPE_META[type].label"
            :value="type"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="分组">
        <el-select
          :model-value="form.group"
          @update:model-value="(value: ConfigFormModel['group']) => updateForm({ group: value })"
        >
          <el-option
            v-for="group in groups"
            :key="group"
            :label="CONFIG_GROUP_META[group].label"
            :value="group"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="备注">
        <el-input
          :model-value="form.remark"
          placeholder="用于说明配置用途"
          @update:model-value="(value: string) => updateForm({ remark: value })"
        />
      </el-form-item>
      <el-form-item label="敏感项">
        <el-switch
          :model-value="form.secret"
          @update:model-value="(value: boolean) => updateForm({ secret: value })"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        取消
      </el-button>
      <el-button
        type="primary"
        @click="emit('submit')"
      >
        确定
      </el-button>
    </template>
  </el-dialog>
</template>
