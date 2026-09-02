<script setup lang="ts">
import type { RoleView } from '@app/contracts';
import { PERMS } from '@app/contracts';
import {
  Clock,
  Delete,
  EditPen,
  Key,
  Plus,
  Refresh,
  RefreshLeft,
  Search,
  Setting,
} from '@element-plus/icons-vue';
import { computed, reactive, watch } from 'vue';
import AppDataTable from '@/components/common/AppDataTable.vue';
import AppPanel from '@/components/common/AppPanel.vue';
import { PAGE_SIZE_OPTIONS } from '@/config/pagination';
import {
  ROLE_CATEGORY_ALL,
  ROLE_CATEGORY_DELETED,
  ROLE_CATEGORY_OPTIONS,
  builtinRoleLabel,
  type RoleFilter,
} from './role-ui.types';

const props = defineProps<{
  list: RoleView[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  filter: RoleFilter;
  formatDate: (value: string) => string;
}>();

const emit = defineEmits<{
  refresh: [];
  search: [value: RoleFilter];
  create: [];
  edit: [row: RoleView];
  permissions: [row: RoleView];
  remove: [row: RoleView];
  restore: [row: RoleView];
  'update:page': [value: number];
  'update:pageSize': [value: number];
}>();

const draft = reactive<RoleFilter>({ ...props.filter });
watch(
  () => props.filter,
  (value) => Object.assign(draft, value),
  { deep: true },
);

const showDeleted = computed(() => props.filter.category === ROLE_CATEGORY_DELETED);

function submitSearch(): void {
  emit('search', { ...draft });
}

function resetSearch(): void {
  draft.keyword = '';
  draft.category = ROLE_CATEGORY_ALL;
  submitSearch();
}

function isDeleted(row: RoleView): boolean {
  return row.deletedAt !== null;
}

function roleTypeText(row: RoleView): string {
  if (isDeleted(row)) {
    return '已删除';
  }
  if (row.isSuper) {
    return '内置超管';
  }
  return row.isBuiltin ? `内置·${builtinRoleLabel(row.code)}` : '自定义角色';
}
</script>

<template>
  <app-panel
    title="角色目录"
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
          v-permission="PERMS.role.create"
          type="primary"
          :icon="Plus"
          @click="emit('create')"
        >
          新建角色
        </el-button>
      </div>
    </template>

    <el-form
      inline
      class="role-filter"
      @submit.prevent="submitSearch"
    >
      <el-form-item label="角色名称">
        <el-input
          v-model="draft.keyword"
          clearable
          placeholder="按名称或编码搜索"
          :prefix-icon="Search"
          class="role-filter__keyword"
          @keyup.enter="submitSearch"
          @clear="submitSearch"
        />
      </el-form-item>
      <el-form-item label="编码分类">
        <el-select
          v-model="draft.category"
          class="role-filter__category"
          @change="submitSearch"
        >
          <el-option
            v-for="option in ROLE_CATEGORY_OPTIONS"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          :icon="Search"
          @click="submitSearch"
        >
          搜索
        </el-button>
        <el-button @click="resetSearch">
          重置
        </el-button>
      </el-form-item>
    </el-form>

    <app-data-table
      :data="list"
      :loading="loading"
      :min-width="1060"
      table-class="role-table"
    >
      <el-table-column
        label="角色"
        min-width="190"
      >
        <template #default="{ row }">
          <div class="role-identity">
            <span :class="['role-avatar', row.isSuper ? 'is-super' : '']">
              <el-icon><Key /></el-icon>
            </span>
            <div>
              <strong>{{ row.name }}</strong>
              <small>{{ row.code }}</small>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="类型"
        width="124"
      >
        <template #default="{ row }">
          <span
            :class="[
              'role-type',
              isDeleted(row) ? 'is-deleted' : '',
              row.isSuper ? 'is-super' : '',
              row.isBuiltin ? 'is-builtin' : '',
            ]"
          >
            {{ roleTypeText(row) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column
        label="权限数"
        width="86"
      >
        <template #default="{ row }">
          <span class="role-permission-count">
            {{ row.isSuper ? '全部' : row.permissionIds.length }}
          </span>
        </template>
      </el-table-column>
      <el-table-column
        prop="remark"
        label="备注"
        min-width="150"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <span class="role-muted">{{ row.remark || '暂无备注' }}</span>
        </template>
      </el-table-column>
      <el-table-column
        :label="showDeleted ? '删除时间' : '创建时间'"
        width="150"
      >
        <template #default="{ row }">
          <span class="role-date">
            <el-icon><Clock /></el-icon>
            {{ formatDate(row.deletedAt ?? row.createdAt) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="240"
      >
        <template #default="{ row }">
          <div
            v-if="isDeleted(row)"
            class="role-actions"
          >
            <el-button
              v-permission="PERMS.role.remove"
              type="primary"
              link
              :icon="RefreshLeft"
              @click="emit('restore', row)"
            >
              恢复
            </el-button>
          </div>
          <div
            v-else
            class="role-actions"
          >
            <el-button
              v-permission="PERMS.role.update"
              type="primary"
              link
              :icon="EditPen"
              @click="emit('edit', row)"
            >
              编辑
            </el-button>
            <el-button
              v-permission="PERMS.role.assignPermissions"
              type="primary"
              link
              :icon="Setting"
              @click="emit('permissions', row)"
            >
              分配权限
            </el-button>
            <el-button
              v-permission="PERMS.role.remove"
              type="danger"
              link
              :icon="Delete"
              :disabled="!row.deletable"
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
