<script setup lang="ts">
import { CircleCheckFilled } from '@element-plus/icons-vue';
import type { CreateUserBody } from '@/api/user.api';

const props = defineProps<{
  modelValue: boolean;
  form: CreateUserBody;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:form': [value: CreateUserBody];
  submit: [];
}>();

function updateField<K extends keyof CreateUserBody>(
  key: K,
  value: CreateUserBody[K],
): void {
  emit('update:form', { ...props.form, [key]: value });
}
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    title="新建用户"
    size="560px"
    class="admin-drawer user-dialog"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <div class="user-dialog__intro">
      <el-icon><CircleCheckFilled /></el-icon>
      <span>创建后可在编辑中绑定单个角色，手机号用于短信验证码登录。</span>
    </div>
    <el-form
      label-position="top"
      class="user-form"
    >
      <div class="user-form__grid">
        <el-form-item label="用户名">
          <el-input
            :model-value="form.username"
            placeholder="请输入登录用户名"
            @update:model-value="(value: string) => updateField('username', value)"
          />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            :model-value="form.password"
            type="password"
            show-password
            placeholder="请输入初始密码"
            @update:model-value="(value: string) => updateField('password', value)"
          />
        </el-form-item>
      </div>
      <div class="user-form__grid">
        <el-form-item label="昵称">
          <el-input
            :model-value="form.nickname"
            placeholder="展示名称，可选"
            @update:model-value="(value: string) => updateField('nickname', value)"
          />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input
            :model-value="form.phone"
            maxlength="11"
            placeholder="选填，用于短信登录"
            @update:model-value="(value: string) => updateField('phone', value)"
          />
        </el-form-item>
      </div>
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
          确定创建
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>
