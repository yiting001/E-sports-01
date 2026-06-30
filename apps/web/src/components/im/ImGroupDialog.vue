<script setup lang="ts">
import type { UserView } from '@app/contracts';
import { CircleCheckFilled } from '@element-plus/icons-vue';

defineProps<{
  modelValue: boolean;
  title: string;
  members: string[];
  users: UserView[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:title': [value: string];
  'update:members': [value: string[]];
  submit: [];
}>();

function userName(user: UserView): string {
  return user.nickname || user.username;
}
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    title="创建群聊"
    size="480px"
    class="admin-drawer im-dialog"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="im-dialog__intro">
      <span class="im-dialog__icon">
        <el-icon><CircleCheckFilled /></el-icon>
      </span>
      <div>
        <strong>建立协作会话</strong>
        <small>创建后会自动进入新群，成员可继续在详情中维护。</small>
      </div>
    </div>
    <el-form
      label-position="top"
      class="im-form"
    >
      <el-form-item label="群名称">
        <el-input
          :model-value="title"
          maxlength="128"
          placeholder="请输入群名称"
          @update:model-value="emit('update:title', String($event))"
        />
      </el-form-item>
      <el-form-item label="成员">
        <el-select
          :model-value="members"
          multiple
          filterable
          placeholder="选择成员"
          class="im-full"
          @update:model-value="emit('update:members', $event as string[])"
        >
          <el-option
            v-for="user in users"
            :key="user.id"
            :label="userName(user)"
            :value="user.id"
          />
        </el-select>
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
          创建
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>
