<script setup lang="ts">
import type { CreateTenantPayload } from "@app/contracts";
import { CircleCheckFilled } from "@element-plus/icons-vue";

const props = defineProps<{
  modelValue: boolean;
  form: CreateTenantPayload;
  submitting: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  "update:form": [value: CreateTenantPayload];
  submit: [];
}>();

function updateField<K extends keyof CreateTenantPayload>(
  key: K,
  value: CreateTenantPayload[K]
): void {
  emit("update:form", { ...props.form, [key]: value });
}
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    title="新建租户"
    size="560px"
    class="admin-drawer tenant-dialog"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <div class="tenant-dialog__intro">
      <el-icon><CircleCheckFilled /></el-icon>
      <span>仅创建租户并初始化内置角色；管理员账号请到用户管理单独创建并选择所属租户。</span>
    </div>
    <el-form
      label-position="top"
      class="tenant-form"
    >
      <div class="tenant-form__grid">
        <el-form-item label="租户编码">
          <el-input
            :model-value="form.code"
            placeholder="小写字母/数字/连字符"
            @update:model-value="(value: string) => updateField('code', value)"
          />
        </el-form-item>
        <el-form-item label="租户名称">
          <el-input
            :model-value="form.name"
            placeholder="请输入租户名称"
            @update:model-value="(value: string) => updateField('name', value)"
          />
        </el-form-item>
      </div>
      <el-form-item label="备注">
        <el-input
          :model-value="form.remark"
          type="textarea"
          :rows="3"
          placeholder="记录业务归属、联系人或开通说明"
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
          :loading="submitting"
          @click="emit('submit')"
        >
          确定创建
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>
