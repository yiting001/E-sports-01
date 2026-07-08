<script setup lang="ts">
import {
  PERMS,
  ProductStatus,
  type CategoryView,
  type ProductView,
} from '@app/contracts';
import {
  Delete,
  Download,
  EditPen,
  Plus,
  Promotion,
  Refresh,
  Search,
  Upload,
} from '@element-plus/icons-vue';
import AppDataTable from '@/components/common/AppDataTable.vue';
import AppPanel from '@/components/common/AppPanel.vue';
import type { ProductFilterModel } from '@/components/commerce/commerce-ui.types';
import { PAGE_SIZE_OPTIONS } from '@/config/pagination';

const props = defineProps<{
  list: ProductView[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  categories: CategoryView[];
  filter: ProductFilterModel;
  statusOptions: Array<{ label: string; value?: ProductStatus }>;
  yuan: (fen: number) => string;
}>();

const emit = defineEmits<{
  'update:filter': [value: ProductFilterModel];
  search: [];
  reset: [];
  refresh: [];
  create: [];
  edit: [row: ProductView];
  marketing: [row: ProductView];
  publish: [row: ProductView];
  remove: [row: ProductView];
  'update:page': [value: number];
  'update:pageSize': [value: number];
}>();

function updateFilter(patch: Partial<ProductFilterModel>): void {
  emit('update:filter', { ...props.filter, ...patch });
}
</script>

<template>
  <app-panel
    title="商品目录"
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
          v-permission="PERMS.product.create"
          type="primary"
          :icon="Plus"
          @click="emit('create')"
        >
          新建商品
        </el-button>
      </div>
    </template>

    <template #toolbar>
      <div class="admin-toolbar commerce-toolbar">
        <el-select
          :model-value="filter.categoryId"
          class="commerce-filter"
          placeholder="全部分类"
          clearable
          :prefix-icon="Search"
          @update:model-value="(value: string | undefined) => updateFilter({ categoryId: value || undefined })"
          @change="emit('search')"
        >
          <el-option
            v-for="category in categories"
            :key="category.id"
            :label="category.name"
            :value="category.id"
          />
        </el-select>
        <el-select
          :model-value="filter.status"
          class="commerce-status-filter"
          placeholder="全部状态"
          clearable
          @update:model-value="(value: ProductStatus | undefined) => updateFilter({ status: value })"
          @change="emit('search')"
        >
          <el-option
            v-for="option in statusOptions.filter((item) => item.value)"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-input
          :model-value="filter.keyword"
          class="commerce-search"
          :prefix-icon="Search"
          clearable
          placeholder="搜索商品名"
          @update:model-value="(value: string) => updateFilter({ keyword: value })"
          @keyup.enter="emit('search')"
        />
        <div class="admin-actions">
          <el-button
            type="primary"
            @click="emit('search')"
          >
            查询
          </el-button>
          <el-button @click="emit('reset')">
            重置
          </el-button>
        </div>
      </div>
    </template>

    <app-data-table
      :data="list"
      :loading="loading"
      :min-width="1120"
      table-class="commerce-table product-table"
      empty-text="暂无商品"
    >
      <el-table-column
        label="商品"
        min-width="260"
      >
        <template #default="{ row }">
          <div class="commerce-identity">
            <el-image
              v-if="row.cover"
              :src="row.cover"
              :preview-src-list="[row.cover]"
              preview-teleported
              fit="cover"
              class="commerce-thumb commerce-thumb--cover"
            />
            <span
              v-else
              class="commerce-letter-icon commerce-letter-icon--product"
            >
              {{ row.title.slice(0, 2) }}
            </span>
            <div>
              <strong>{{ row.title }}</strong>
              <small>{{ row.coverTitle || '未设置封面主标语' }}</small>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="分类"
        width="130"
      >
        <template #default="{ row }">
          <el-tag round>
            {{ row.categoryName }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="价格"
        width="140"
      >
        <template #default="{ row }">
          <div class="commerce-price">
            <strong>{{ yuan(row.priceFen) }}</strong>
            <small>{{ yuan(row.originPriceFen) }}</small>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        prop="sold"
        label="已售"
        width="90"
        align="center"
      />
      <el-table-column
        prop="sort"
        label="排序"
        width="90"
        align="center"
      />
      <el-table-column
        label="关联客服"
        min-width="130"
      >
        <template #default="{ row }">
          <span class="commerce-muted">{{ row.serviceAgentName || '未关联' }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            round
            :type="row.status === ProductStatus.OnShelf ? 'success' : 'info'"
          >
            {{ row.status === ProductStatus.OnShelf ? '已上架' : '已下架' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="290"
      >
        <template #default="{ row }">
          <div class="commerce-actions">
            <el-button
              v-permission="PERMS.product.update"
              type="primary"
              link
              :icon="EditPen"
              @click="emit('edit', row)"
            >
              编辑
            </el-button>
            <el-button
              v-permission="PERMS.product.update"
              type="warning"
              link
              :icon="Promotion"
              @click="emit('marketing', row)"
            >
              营销
            </el-button>
            <el-button
              v-permission="PERMS.product.publish"
              link
              :type="row.status === ProductStatus.OnShelf ? 'warning' : 'success'"
              :icon="row.status === ProductStatus.OnShelf ? Download : Upload"
              @click="emit('publish', row)"
            >
              {{ row.status === ProductStatus.OnShelf ? '下架' : '上架' }}
            </el-button>
            <el-button
              v-permission="PERMS.product.remove"
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
