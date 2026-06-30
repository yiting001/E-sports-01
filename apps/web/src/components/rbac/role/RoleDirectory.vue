<script setup lang="ts">
import type { RoleView } from '@app/contracts';
import { PERMS } from '@app/contracts';
import { Clock, Delete, EditPen, Key, Plus, Refresh, Setting } from '@element-plus/icons-vue';
import AppDataTable from '@/components/common/AppDataTable.vue';
import AppPanel from '@/components/common/AppPanel.vue';
import { PAGE_SIZE_OPTIONS } from '@/config/pagination';

defineProps<{
  list: RoleView[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  formatDate: (value: string) => string;
}>();

const emit = defineEmits<{
  refresh: [];
  create: [];
  edit: [row: RoleView];
  permissions: [row: RoleView];
  remove: [row: RoleView];
  'update:page': [value: number];
  'update:pageSize': [value: number];
}>();
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
        width="96"
      >
        <template #default="{ row }">
          <span :class="['role-type', row.isSuper ? 'is-super' : '']">
            {{ row.isSuper ? '内置角色' : '业务角色' }}
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
        label="创建时间"
        width="150"
      >
        <template #default="{ row }">
          <span class="role-date">
            <el-icon><Clock /></el-icon>
            {{ formatDate(row.createdAt) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="240"
      >
        <template #default="{ row }">
          <div class="role-actions">
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
              :disabled="row.isSuper"
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
