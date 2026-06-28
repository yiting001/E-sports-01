<script setup lang="ts">
import type { ConversationDetailView, ConversationMemberView, UserView } from '@app/contracts';
import { UserFilled } from '@element-plus/icons-vue';

defineProps<{
  modelValue: boolean;
  detail: ConversationDetailView | null;
  candidates: UserView[];
  picks: string[];
  canManage: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:picks': [value: string[]];
  add: [];
  remove: [userId: string];
}>();

function userName(user: UserView): string {
  return user.nickname || user.username;
}

function memberRoleLabel(role: ConversationMemberView['role']): string {
  const labels: Record<ConversationMemberView['role'], string> = {
    owner: '群主',
    admin: '管理员',
    member: '成员',
    agent: '客服',
  };
  return labels[role];
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="群成员管理"
    width="520px"
    class="im-dialog"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="im-dialog__intro">
      <span class="im-dialog__icon">
        <el-icon><UserFilled /></el-icon>
      </span>
      <div>
        <strong>{{ detail?.title || '群成员' }}</strong>
        <small>{{ detail?.members.length || 0 }} 位成员</small>
      </div>
    </div>

    <div
      v-if="canManage"
      class="im-member-add"
    >
      <el-select
        :model-value="picks"
        multiple
        filterable
        placeholder="选择要加入的成员"
        class="im-full"
        @update:model-value="emit('update:picks', $event as string[])"
      >
        <el-option
          v-for="user in candidates"
          :key="user.id"
          :label="userName(user)"
          :value="user.id"
        />
      </el-select>
      <el-button
        type="primary"
        @click="emit('add')"
      >
        加入
      </el-button>
    </div>

    <el-table
      :data="detail?.members ?? []"
      size="small"
      class="im-member-table"
    >
      <el-table-column
        label="成员"
        min-width="180"
      >
        <template #default="{ row }">
          <div class="im-member">
            <span>{{ row.username.slice(0, 2).toUpperCase() }}</span>
            <strong>{{ row.username }}</strong>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="角色"
        width="100"
      >
        <template #default="{ row }">
          <span class="im-role">{{ memberRoleLabel(row.role) }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="90"
      >
        <template #default="{ row }">
          <el-button
            v-if="canManage && row.role !== 'owner'"
            type="danger"
            size="small"
            link
            @click="emit('remove', row.userId)"
          >
            移除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-dialog>
</template>
