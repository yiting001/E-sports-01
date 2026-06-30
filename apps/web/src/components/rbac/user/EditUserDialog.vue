<script setup lang="ts">
import type { RoleView, UserStatusEnum } from '@app/contracts';
import { Connection } from '@element-plus/icons-vue';
import type { EditUserForm } from './user-ui.types';

const props = defineProps<{
  modelValue: boolean;
  form: EditUserForm;
  roles: RoleView[];
  statusOptions: Array<{ label: string; value: UserStatusEnum }>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:form': [value: EditUserForm];
  submit: [];
}>();

function updateField<K extends keyof EditUserForm>(
  key: K,
  value: EditUserForm[K],
): void {
  emit('update:form', { ...props.form, [key]: value });
}
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    title="编辑用户"
    size="560px"
    class="admin-drawer user-dialog"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <div class="user-dialog__intro">
      <el-icon><Connection /></el-icon>
      <span>{{ form.username }} 当前仅支持绑定一个角色，可清空后保存为未分配。</span>
    </div>
    <el-form
      label-position="top"
      class="user-form"
    >
      <div class="user-form__grid">
        <el-form-item label="昵称">
          <el-input
            :model-value="form.nickname"
            @update:model-value="(value: string) => updateField('nickname', value)"
          />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input
            :model-value="form.phone"
            maxlength="11"
            placeholder="用于短信登录，留空可解绑"
            @update:model-value="(value: string) => updateField('phone', value)"
          />
        </el-form-item>
      </div>
      <div class="user-form__grid">
        <el-form-item label="状态">
          <el-select
            :model-value="form.status"
            class="user-form__full"
            @update:model-value="(value: UserStatusEnum) => updateField('status', value)"
          >
            <el-option
              v-for="s in statusOptions"
              :key="s.value"
              :label="s.label"
              :value="s.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="角色">
          <el-select
            :model-value="form.roleId"
            clearable
            placeholder="单选一个角色（可清空）"
            class="user-form__full"
            @update:model-value="(value: string) => updateField('roleId', value)"
          >
            <el-option
              v-for="role in roles"
              :key="role.id"
              :label="role.name"
              :value="role.id"
            />
          </el-select>
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
          保存
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>
