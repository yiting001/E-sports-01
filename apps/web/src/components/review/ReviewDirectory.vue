<script setup lang="ts">
import { PERMS, type AdminReviewView } from '@app/contracts';
import { ChatDotSquare, Delete, Hide, Refresh, Search, View } from '@element-plus/icons-vue';
import AppDataTable from '@/components/common/AppDataTable.vue';
import AppPanel from '@/components/common/AppPanel.vue';
import { PAGE_SIZE_OPTIONS } from '@/config/pagination';

defineProps<{
  list: AdminReviewView[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  ratingFilter?: number;
  visibleFilter?: boolean;
  ratingOptions: Array<{ label: string; value?: number }>;
  visibleOptions: Array<{ label: string; value?: boolean }>;
  formatDate: (value: string) => string;
}>();

const emit = defineEmits<{
  'update:ratingFilter': [value?: number];
  'update:visibleFilter': [value?: boolean];
  filter: [];
  refresh: [];
  toggle: [row: AdminReviewView];
  remove: [row: AdminReviewView];
  'update:page': [value: number];
  'update:pageSize': [value: number];
}>();
</script>

<template>
  <app-panel
    title="评论审核"
    eyebrow="Review Moderation"
  >
    <template #actions>
      <div class="admin-actions">
        <el-select
          :model-value="ratingFilter"
          class="review-filter"
          placeholder="按星级筛选"
          :prefix-icon="Search"
          @update:model-value="emit('update:ratingFilter', $event as number | undefined)"
          @change="emit('filter')"
        >
          <el-option
            v-for="opt in ratingOptions"
            :key="opt.value ?? 'all'"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <el-select
          :model-value="visibleFilter"
          class="review-filter"
          placeholder="按状态筛选"
          :prefix-icon="Search"
          @update:model-value="emit('update:visibleFilter', $event as boolean | undefined)"
          @change="emit('filter')"
        >
          <el-option
            v-for="opt in visibleOptions"
            :key="String(opt.value ?? 'all')"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <el-button
          :icon="Refresh"
          @click="emit('refresh')"
        >
          刷新
        </el-button>
      </div>
    </template>

    <app-data-table
      :data="list"
      :loading="loading"
      :min-width="1080"
      table-class="review-table"
      empty-text="暂无评论"
    >
      <el-table-column
        label="评论用户"
        min-width="160"
      >
        <template #default="{ row }">
          <div class="review-user">
            <span class="review-user__avatar">
              <el-icon><ChatDotSquare /></el-icon>
            </span>
            <div>
              <strong>{{ row.nickname || row.username }}</strong>
              <small>{{ row.username }}</small>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="商品"
        min-width="160"
      >
        <template #default="{ row }">
          <span class="review-content">{{ row.productTitle }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="订单号"
        min-width="150"
      >
        <template #default="{ row }">
          <span class="review-muted">{{ row.orderNo }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="星级"
        width="130"
      >
        <template #default="{ row }">
          <el-rate
            :model-value="row.rating"
            disabled
          />
        </template>
      </el-table-column>
      <el-table-column
        label="评论内容"
        min-width="240"
      >
        <template #default="{ row }">
          <span class="review-content">{{ row.content }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            round
            effect="light"
            :type="row.visible ? 'success' : 'info'"
          >
            {{ row.visible ? '展示中' : '已隐藏' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="评论时间"
        width="150"
      >
        <template #default="{ row }">
          <span class="review-muted">{{ formatDate(row.createdAt) }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="160"
      >
        <template #default="{ row }">
          <el-button
            v-permission="PERMS.review.moderate"
            link
            type="primary"
            :icon="row.visible ? Hide : View"
            @click="emit('toggle', row)"
          >
            {{ row.visible ? '隐藏' : '恢复' }}
          </el-button>
          <el-button
            v-permission="PERMS.review.remove"
            link
            type="danger"
            :icon="Delete"
            @click="emit('remove', row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </app-data-table>

    <div class="admin-pager">
      <span class="review-pager__summary">共 {{ total }} 条评论</span>
      <el-pagination
        class="review-pagination"
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
