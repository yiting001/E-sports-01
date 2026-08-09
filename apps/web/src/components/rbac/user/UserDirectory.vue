<script setup lang="ts">
import type { RoleView, UserView } from '@app/contracts';
import { PERMS, UserStatusEnum } from '@app/contracts';
import {
  Clock,
  Delete,
  EditPen,
  Key,
  Phone,
  Plus,
  Refresh,
  RefreshLeft,
  Search,
} from '@element-plus/icons-vue';
import AppDataTable from '@/components/common/AppDataTable.vue';
import AppPanel from '@/components/common/AppPanel.vue';
import { PAGE_SIZE_OPTIONS } from '@/config/pagination';
import type { UserFiltersForm } from './user-ui.types';

const props = defineProps<{
  list: UserView[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  isSuper: boolean;
  canFilterByRole: boolean;
  filters: UserFiltersForm;
  roles: RoleView[];
  statusOptions: Array<{ label: string; value: UserStatusEnum }>;
  statusLabel: (status: UserStatusEnum) => string;
  formatDate: (value: string) => string;
}>();

const emit = defineEmits<{
  refresh: [];
  create: [];
  edit: [row: UserView];
  resetPassword: [row: UserView];
  remove: [row: UserView];
  search: [];
  resetFilters: [];
  'update:filters': [value: UserFiltersForm];
  'update:page': [value: number];
  'update:pageSize': [value: number];
}>();

function updateFilter<K extends keyof UserFiltersForm>(
  key: K,
  value: UserFiltersForm[K],
): void {
  emit('update:filters', { ...props.filters, [key]: value });
}

function updateKeywordFilter(value: unknown): void {
  updateFilter('keyword', typeof value === 'string' ? value : String(value ?? ''));
}

function updateStatusFilter(value: unknown): void {
  const status =
    value === UserStatusEnum.Enabled || value === UserStatusEnum.Disabled ? value : '';
  updateFilter('status', status);
}

function updateRoleFilter(value: unknown): void {
  updateFilter('roleId', typeof value === 'string' ? value : '');
}
</script>

<template>
  <app-panel
    title="用户目录"
    eyebrow="Directory"
  >
    <template #actions>
      <div class="admin-actions">
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
    </template>

    <div class="user-filter-bar">
      <el-input
        :model-value="filters.keyword"
        class="user-filter-bar__keyword"
        clearable
        :prefix-icon="Search"
        placeholder="搜索 ID / 用户名 / 昵称 / 手机号"
        @update:model-value="updateKeywordFilter"
        @clear="emit('search')"
        @keyup.enter="emit('search')"
      />
      <el-select
        :model-value="filters.status"
        class="user-filter-bar__select"
        clearable
        placeholder="状态"
        @update:model-value="updateStatusFilter"
        @clear="updateStatusFilter"
      >
        <el-option
          v-for="s in statusOptions"
          :key="s.value"
          :label="s.label"
          :value="s.value"
        />
      </el-select>
      <el-select
        v-if="canFilterByRole"
        :model-value="filters.roleId"
        class="user-filter-bar__select"
        clearable
        filterable
        placeholder="角色"
        @update:model-value="updateRoleFilter"
        @clear="updateRoleFilter"
      >
        <el-option
          v-for="role in roles"
          :key="role.id"
          :label="role.name"
          :value="role.id"
        />
      </el-select>
      <div class="user-filter-bar__actions">
        <el-button
          type="primary"
          :icon="Search"
          @click="emit('search')"
        >
          搜索
        </el-button>
        <el-button
          :icon="RefreshLeft"
          @click="emit('resetFilters')"
        >
          重置
        </el-button>
      </div>
    </div>

    <app-data-table
      :data="list"
      :loading="loading"
      :min-width="1040"
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
        width="230"
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
              v-permission="PERMS.user.update"
              type="warning"
              link
              :icon="Key"
              @click="emit('resetPassword', row)"
            >
              重置密码
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
      class="admin-pager"
      layout="total, sizes, prev, pager, next"
      :total="total"
      :current-page="page"
      :page-size="pageSize"
      :page-sizes="[...PAGE_SIZE_OPTIONS]"
      @size-change="(value: number) => emit('update:pageSize', value)"
      @current-change="(value: number) => emit('update:page', value)"
    />
  </app-panel>
</template>
