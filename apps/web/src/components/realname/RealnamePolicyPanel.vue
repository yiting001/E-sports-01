<script setup lang="ts">
import type { RoleView } from '@app/contracts';
import { PERMS } from '@app/contracts';
import { Lock, Refresh, Setting } from '@element-plus/icons-vue';

defineProps<{
  roles: RoleView[];
  selectedRoleCodes: string[];
  loading: boolean;
  saving: boolean;
}>();

const emit = defineEmits<{
  'update:selectedRoleCodes': [value: string[]];
  refresh: [];
  save: [];
}>();
</script>

<template>
  <section
    v-loading="loading"
    class="realname-panel realname-policy"
  >
    <div class="realname-panel__head">
      <div>
        <span class="realname-eyebrow">Policy</span>
        <h2>实名策略</h2>
      </div>
      <div class="realname-panel__actions">
        <el-button
          :icon="Refresh"
          @click="emit('refresh')"
        >
          刷新
        </el-button>
        <el-button
          v-permission="PERMS.realname.policy"
          type="primary"
          :icon="Setting"
          :loading="saving"
          @click="emit('save')"
        >
          保存策略
        </el-button>
      </div>
    </div>

    <div class="realname-policy__body">
      <div class="realname-policy__intro">
        <span>
          <el-icon><Lock /></el-icon>
        </span>
        <div>
          <strong>角色实名要求</strong>
          <p>勾选的角色会被要求完成实名认证；命中任一角色的用户将在个人实名认证页看到提示。</p>
        </div>
      </div>

      <el-checkbox-group
        :model-value="selectedRoleCodes"
        class="realname-role-grid"
        @update:model-value="emit('update:selectedRoleCodes', $event as string[])"
      >
        <el-checkbox
          v-for="role in roles"
          :key="role.code"
          :value="role.code"
          class="realname-role"
        >
          <span class="realname-role__name">{{ role.name }}</span>
          <span class="realname-role__code">{{ role.code }}</span>
        </el-checkbox>
      </el-checkbox-group>

      <el-empty
        v-if="roles.length === 0"
        description="暂无可配置的角色"
      />
    </div>
  </section>
</template>
