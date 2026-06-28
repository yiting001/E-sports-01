<script setup lang="ts">
import type { UserView } from '@app/contracts';
import { PERMS, UserStatusEnum } from '@app/contracts';
import { Clock, Delete, EditPen, Phone, Plus, Refresh } from '@element-plus/icons-vue';
import AppDataTable from '@/components/common/AppDataTable.vue';

defineProps<{
  list: UserView[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  isSuper: boolean;
  statusLabel: (status: UserStatusEnum) => string;
  formatDate: (value: string) => string;
}>();

const emit = defineEmits<{
  refresh: [];
  create: [];
  edit: [row: UserView];
  remove: [row: UserView];
  'update:page': [value: number];
}>();
</script>

<template>
  <section class="user-panel">
    <div class="user-panel__head">
      <div>
        <span class="user-eyebrow">Directory</span>
        <h2>用户目录</h2>
      </div>
      <div class="user-panel__actions">
        <el-button
          :icon="Refresh"
          @click="emit('refresh')"
        >
          刷新
        </el-button>
        <el-button
          v-permission="PERMS.user.create"
          type="primary"
          :icon="Plus"
          @click="emit('create')"
        >
          新建用户
        </el-button>
      </div>
    </div>

    <app-data-table
      :data="list"
      :loading="loading"
      :min-width="900"
      table-class="user-table"
    >
      <el-table-column
        label="用户"
        min-width="170"
      >
        <template #default="{ row }">
          <div class="user-identity">
            <span class="user-avatar">{{ row.username.slice(0, 2).toUpperCase() }}</span>
            <div>
              <strong>{{ row.nickname || row.username }}</strong>
              <small>{{ row.username }}</small>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="手机号"
        width="120"
      >
        <template #default="{ row }">
          <span :class="['user-phone', row.phone ? '' : 'is-empty']">
            <el-icon><Phone /></el-icon>
            {{ row.phone || '未绑定' }}
          </span>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            round
            :type="row.status === UserStatusEnum.Enabled ? 'success' : 'info'"
          >
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        v-if="isSuper"
        label="所属租户"
        width="105"
      >
        <template #default="{ row }">
          <span class="user-tenant">{{ row.tenantCode || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="角色"
        min-width="130"
      >
        <template #default="{ row }">
          <div class="user-role-tags">
            <el-tag
              v-for="role in row.roles"
              :key="role.id"
              round
            >
              {{ role.name }}
            </el-tag>
            <span
              v-if="!row.roles.length"
              class="user-muted"
            >
              未分配
            </span>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="创建时间"
        width="140"
      >
        <template #default="{ row }">
          <span class="user-date">
            <el-icon><Clock /></el-icon>
            {{ formatDate(row.createdAt) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="150"
      >
        <template #default="{ row }">
          <div class="user-actions">
            <el-button
              v-permission="PERMS.user.update"
              type="primary"
              link
              :icon="EditPen"
              @click="emit('edit', row)"
            >
              编辑
            </el-button>
            <el-button
              v-permission="PERMS.user.remove"
              type="danger"
              link
              :icon="Delete"
              @click="emit('remove', row)"
            >
              删除
            </el-button>
          </div>
        </template>
      </el-table-column>
    </app-data-table>
    <el-pagination
      class="user-pager"
      layout="total, prev, pager, next"
      :total="total"
      :current-page="page"
      :page-size="pageSize"
      @current-change="(value: number) => emit('update:page', value)"
    />
  </section>
</template>
