<script setup lang="ts">
import type { CategoryView } from '@app/contracts';
import { PERMS } from '@app/contracts';
import { Delete, EditPen, Picture, Plus, Refresh } from '@element-plus/icons-vue';
import AppDataTable from '@/components/common/AppDataTable.vue';
import AppPanel from '@/components/common/AppPanel.vue';
import { PAGE_SIZE_OPTIONS } from '@/config/pagination';

defineProps<{
  list: CategoryView[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  formatDate: (value: string) => string;
}>();

const emit = defineEmits<{
  refresh: [];
  create: [];
  edit: [row: CategoryView];
  remove: [row: CategoryView];
  'update:page': [value: number];
  'update:pageSize': [value: number];
}>();
</script>

<template>
  <app-panel
    title="分类目录"
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
          v-permission="PERMS.category.create"
          type="primary"
          :icon="Plus"
          @click="emit('create')"
        >
          新建分类
        </el-button>
      </div>
    </template>

    <app-data-table
      :data="list"
      :loading="loading"
      :min-width="920"
      table-class="commerce-table category-table"
      empty-text="暂无商品分类"
    >
      <el-table-column
        label="分类"
        min-width="220"
      >
        <template #default="{ row }">
          <div class="commerce-identity">
            <el-image
              v-if="row.icon"
              :src="row.icon"
              :preview-src-list="[row.icon]"
              preview-teleported
              fit="cover"
              class="commerce-thumb commerce-thumb--icon"
            />
            <span
              v-else
              class="commerce-letter-icon"
            >
              {{ row.cover || row.name.slice(0, 2) }}
            </span>
            <div>
              <strong>{{ row.name }}</strong>
              <small>{{ row.icon ? '图片图标' : '文字图标' }}</small>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="文字图标"
        min-width="140"
      >
        <template #default="{ row }">
          <span class="commerce-muted">{{ row.cover || '按分类名显示' }}</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="sort"
        label="排序"
        width="90"
        align="center"
      />
      <el-table-column
        label="商品数"
        width="100"
        align="center"
      >
        <template #default="{ row }">
          <span class="commerce-number">{{ row.productCount }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            round
            :type="row.enabled ? 'success' : 'info'"
          >
            {{ row.enabled ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="更新时间"
        width="170"
      >
        <template #default="{ row }">
          <span class="commerce-date">{{ formatDate(row.updatedAt) }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="150"
      >
        <template #default="{ row }">
          <div class="commerce-actions">
            <el-button
              v-permission="PERMS.category.update"
              type="primary"
              link
              :icon="EditPen"
              @click="emit('edit', row)"
            >
              编辑
            </el-button>
            <el-button
              v-permission="PERMS.category.remove"
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

    <div class="admin-pager">
      <span class="commerce-pager__summary">
        <el-icon><Picture /></el-icon>
        共 {{ total }} 个分类
      </span>
      <el-pagination
        layout="total, sizes, prev, pager, next"
        :total="total"
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[...PAGE_SIZE_OPTIONS]"
        @size-change="(value: number) => emit('update:pageSize', value)"
        @current-change="(value: number) => emit('update:page', value)"
      />
    </div>
  </app-panel>
</template>
