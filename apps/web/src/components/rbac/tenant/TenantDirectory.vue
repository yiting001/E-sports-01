<script setup lang="ts">
import type { TenantView } from '@app/contracts';
import { PERMS, TenantStatus } from '@app/contracts';
import { Clock, Delete, EditPen, Plus, Refresh, Search } from '@element-plus/icons-vue';
import AppDataTable from '@/components/common/AppDataTable.vue';
import AppPanel from '@/components/common/AppPanel.vue';
import { PAGE_SIZE_OPTIONS } from '@/config/pagination';

defineProps<{
  list: TenantView[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  keyword: string;
  statusLabel: (status: TenantStatus) => string;
  formatDate: (value: string) => string;
}>();

const emit = defineEmits<{
  'update:keyword': [value: string];
  'update:page': [value: number];
  search: [];
  reset: [];
  create: [];
  edit: [row: TenantView];
  remove: [row: TenantView];
  'update:pageSize': [value: number];
}>();
</script>

<template>
  <app-panel
    title="租户目录"
    eyebrow="Directory"
  >
    <template #actions>
      <el-button
        v-permission="PERMS.tenant.create"
        type="primary"
        :icon="Plus"
        @click="emit('create')"
      >
        新建租户
      </el-button>
    </template>

    <template #toolbar>
      <div class="admin-toolbar">
        <el-input
          :model-value="keyword"
          clearable
          class="tenant-search"
          placeholder="搜索租户编码或名称"
          :prefix-icon="Search"
          @update:model-value="(value: string) => emit('update:keyword', value.trim())"
          @keyup.enter="emit('search')"
          @clear="emit('search')"
        />
        <div class="admin-actions">
          <el-button
            :icon="Search"
            @click="emit('search')"
          >
            搜索
          </el-button>
          <el-button
            :icon="Refresh"
            @click="emit('reset')"
          >
            重置
          </el-button>
        </div>
      </div>
    </template>

    <app-data-table
      :data="list"
      :loading="loading"
      :min-width="900"
      table-class="tenant-table"
    >
      <el-table-column
        label="租户"
        min-width="190"
      >
        <template #default="{ row }">
          <div class="tenant-identity">
            <span class="tenant-avatar">{{ row.code.slice(0, 2).toUpperCase() }}</span>
            <div>
              <strong>{{ row.name }}</strong>
              <small>{{ row.code }}</small>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            round
            :type="row.status === TenantStatus.Enabled ? 'success' : 'info'"
          >
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="类型"
        width="108"
      >
        <template #default="{ row }">
          <span :class="['tenant-type', row.builtin ? 'is-builtin' : '']">
            {{ row.builtin ? '内置租户' : '普通租户' }}
          </span>
        </template>
      </el-table-column>
      <el-table-column
        prop="remark"
        label="备注"
        min-width="190"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <span class="tenant-muted">{{ row.remark || '暂无备注' }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="创建时间"
        width="160"
      >
        <template #default="{ row }">
          <span class="tenant-date">
            <el-icon><Clock /></el-icon>
            {{ formatDate(row.createdAt) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="160"
      >
        <template #default="{ row }">
          <div class="tenant-actions">
            <el-button
              v-permission="PERMS.tenant.update"
              type="primary"
              link
              :icon="EditPen"
              @click="emit('edit', row)"
            >
              编辑
            </el-button>
            <el-button
              v-permission="PERMS.tenant.remove"
              type="danger"
              link
              :icon="Delete"
              :disabled="row.builtin"
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
