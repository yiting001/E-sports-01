<script setup lang="ts">
import type { CreateTenantPayload } from '@app/contracts';
import { CircleCheckFilled } from '@element-plus/icons-vue';

const props = defineProps<{
  modelValue: boolean;
  form: CreateTenantPayload;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:form': [value: CreateTenantPayload];
  submit: [];
}>();

function updateField<K extends keyof CreateTenantPayload>(
  key: K,
  value: CreateTenantPayload[K],
): void {
  emit('update:form', { ...props.form, [key]: value });
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="新建租户"
    width="520px"
    class="tenant-dialog"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <div class="tenant-dialog__intro">
      <el-icon><CircleCheckFilled /></el-icon>
      <span>创建后会自动初始化租户管理员角色与账号。</span>
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
      <div class="tenant-form__grid">
        <el-form-item label="管理员账号">
          <el-input
            :model-value="form.adminUsername"
            placeholder="选填，默认 <编码>_admin"
            @update:model-value="(value: string) => updateField('adminUsername', value)"
          />
        </el-form-item>
        <el-form-item label="管理员密码">
          <el-input
            :model-value="form.adminPassword"
            type="password"
            show-password
            placeholder="选填，默认平台初始密码"
            @update:model-value="(value: string) => updateField('adminPassword', value)"
          />
        </el-form-item>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        取消
      </el-button>
      <el-button
        type="primary"
        @click="emit('submit')"
      >
        确定创建
      </el-button>
    </template>
  </el-dialog>
</template>
