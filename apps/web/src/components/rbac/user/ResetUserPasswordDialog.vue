<script setup lang="ts">
import { Key } from '@element-plus/icons-vue';
import type { ResetUserPasswordForm } from './user-ui.types';

const props = defineProps<{
  modelValue: boolean;
  form: ResetUserPasswordForm;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:form': [value: ResetUserPasswordForm];
  submit: [];
}>();

function updateField<K extends keyof ResetUserPasswordForm>(
  key: K,
  value: ResetUserPasswordForm[K],
): void {
  emit('update:form', { ...props.form, [key]: value });
}
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    title="重置密码"
    size="460px"
    class="admin-drawer user-dialog"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <div class="user-dialog__intro">
      <el-icon><Key /></el-icon>
      <span>{{ form.nickname || form.username }} 的新密码保存后立即生效。</span>
    </div>
    <el-form
      label-position="top"
      class="user-form"
    >
      <el-form-item label="新密码">
        <el-input
          :model-value="form.password"
          type="password"
          show-password
          placeholder="请输入 6-128 位新密码"
          @update:model-value="(value: string) => updateField('password', value)"
        />
      </el-form-item>
      <el-form-item label="确认新密码">
        <el-input
          :model-value="form.confirmPassword"
          type="password"
          show-password
          placeholder="请再次输入新密码"
          @update:model-value="(value: string) => updateField('confirmPassword', value)"
          @keyup.enter="emit('submit')"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="admin-drawer__footer">
        <el-button @click="emit('update:modelValue', false)">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="emit('submit')"
        >
          确认重置
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>
