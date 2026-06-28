<script setup lang="ts">
import { CircleCheckFilled, Lock } from '@element-plus/icons-vue';
import type { RoleForm } from './role-ui.types';

const props = defineProps<{
  modelValue: boolean;
  form: RoleForm;
  isEdit: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:form': [value: RoleForm];
  submit: [];
}>();

function updateField<K extends keyof RoleForm>(key: K, value: RoleForm[K]): void {
  emit('update:form', { ...props.form, [key]: value });
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="isEdit ? '编辑角色' : '新建角色'"
    width="500px"
    class="role-dialog"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <div class="role-dialog__intro">
      <el-icon>
        <Lock v-if="isEdit" />
        <CircleCheckFilled v-else />
      </el-icon>
      <span>{{ isEdit ? '角色编码创建后不可修改，避免授权引用漂移。' : '创建角色后可在角色目录中继续分配权限。' }}</span>
    </div>
    <el-form
      label-position="top"
      class="role-form"
    >
      <div class="role-form__grid">
        <el-form-item label="角色编码">
          <el-input
            :model-value="form.code"
            :disabled="isEdit"
            placeholder="如 service 或 operator"
            @update:model-value="(value: string) => updateField('code', value)"
          />
        </el-form-item>
        <el-form-item label="角色名称">
          <el-input
            :model-value="form.name"
            placeholder="请输入角色名称"
            @update:model-value="(value: string) => updateField('name', value)"
          />
        </el-form-item>
      </div>
      <el-form-item label="备注">
        <el-input
          :model-value="form.remark"
          type="textarea"
          :rows="3"
          placeholder="说明角色职责、适用岗位或授权范围"
          @update:model-value="(value: string) => updateField('remark', value)"
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
        {{ isEdit ? '保存' : '确定创建' }}
      </el-button>
    </template>
  </el-dialog>
</template>
