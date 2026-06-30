<script setup lang="ts">
import type { TenantStatus } from '@app/contracts';
import { SwitchButton } from '@element-plus/icons-vue';
import type { EditTenantForm } from './tenant-ui.types';

const props = defineProps<{
  modelValue: boolean;
  form: EditTenantForm;
  statusOptions: Array<{ label: string; value: TenantStatus }>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:form': [value: EditTenantForm];
  submit: [];
}>();

function updateField<K extends keyof EditTenantForm>(
  key: K,
  value: EditTenantForm[K],
): void {
  emit('update:form', { ...props.form, [key]: value });
}
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    title="编辑租户"
    size="520px"
    class="admin-drawer tenant-dialog"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <div
      v-if="form.builtin"
      class="tenant-dialog__intro is-warning"
    >
      <el-icon><SwitchButton /></el-icon>
      <span>内置默认租户不可停用或删除，只允许维护名称与备注。</span>
    </div>
    <el-form
      label-position="top"
      class="tenant-form"
    >
      <el-form-item label="租户名称">
        <el-input
          :model-value="form.name"
          @update:model-value="(value: string) => updateField('name', value)"
        />
      </el-form-item>
      <el-form-item label="状态">
        <el-select
          :model-value="form.status"
          :disabled="form.builtin"
          class="tenant-form__full"
          @update:model-value="(value: TenantStatus) => updateField('status', value)"
        >
          <el-option
            v-for="s in statusOptions"
            :key="s.value"
            :label="s.label"
            :value="s.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="备注">
        <el-input
          :model-value="form.remark"
          type="textarea"
          :rows="3"
          @update:model-value="(value: string) => updateField('remark', value)"
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
          保存
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>
