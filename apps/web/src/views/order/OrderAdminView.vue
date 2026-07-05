<script setup lang="ts">
/**
 * 订单管理页：分页检索全量订单（状态/订单号过滤）+ 查看单笔详情。
 * 只读检索本期实现；客服指派打手/下发接单大厅在后续迭代扩展。
 */
import { onMounted, ref } from 'vue';
import {
  ORDER_STATUS_TEXT,
  OrderStatus,
  PAGINATION_DEFAULTS,
  PAYMENT_PROVIDER_TEXT,
  type AdminOrderView,
  type PaymentProvider,
} from '@app/contracts';
import { Refresh, Search } from '@element-plus/icons-vue';
import AppDataTable from '@/components/common/AppDataTable.vue';
import AppPanel from '@/components/common/AppPanel.vue';
import OrderDetailDrawer from '@/components/order/OrderDetailDrawer.vue';
import ProductPreviewDialog from '@/components/order/ProductPreviewDialog.vue';
import { PAGE_SIZE_OPTIONS } from '@/config/pagination';
import { orderApi } from '@/api/order.api';

const list = ref<AdminOrderView[]>([]);
const total = ref(0);
const page = ref<number>(PAGINATION_DEFAULTS.page);
const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
const loading = ref(false);

const statusFilter = ref<OrderStatus | undefined>(undefined);
const orderNoFilter = ref('');

const detailVisible = ref(false);
const current = ref<AdminOrderView | null>(null);

const productVisible = ref(false);
const productId = ref('');

/** 点击订单中的商品 → 弹窗预览商品详情 */
function openProduct(id: string): void {
  productId.value = id;
  productVisible.value = true;
}

/** 状态 → 标签颜色（与订单状态机阶段对应） */
const STATUS_TAG: Record<
  OrderStatus,
  'info' | 'warning' | 'primary' | 'success' | 'danger'
> = {
  [OrderStatus.PendingPayment]: 'warning',
  [OrderStatus.PendingService]: 'primary',
  [OrderStatus.Dispatching]: 'primary',
  [OrderStatus.Serving]: 'primary',
  [OrderStatus.Completed]: 'success',
  [OrderStatus.Cancelled]: 'info',
};

const statusOptions = Object.values(OrderStatus).map((status) => ({
  label: ORDER_STATUS_TEXT[status],
  value: status,
}));

function formatDate(value: string): string {
  if (!value) {
    return '-';
  }
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await orderApi.list(
      page.value,
      pageSize.value,
      statusFilter.value,
      orderNoFilter.value.trim(),
    );
    list.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

async function search(): Promise<void> {
  page.value = PAGINATION_DEFAULTS.page;
  await load();
}

async function changePage(value: number): Promise<void> {
  page.value = value;
  await load();
}

async function changePageSize(value: number): Promise<void> {
  pageSize.value = value;
  page.value = PAGINATION_DEFAULTS.page;
  await load();
}

function openDetail(row: AdminOrderView): void {
  current.value = row;
  detailVisible.value = true;
}

onMounted(load);
</script>

<template>
  <section class="admin-page order-page">
    <app-panel
      title="订单管理"
      eyebrow="Orders"
      description="用户下单支付后进入「待客服处理」，客服指派打手/下发接单大厅在后续迭代开放"
    >
      <template #actions>
        <div class="admin-actions">
          <el-select
            v-model="statusFilter"
            placeholder="全部状态"
            clearable
            class="order-filter"
            @change="search"
          >
            <el-option
              v-for="option in statusOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <el-input
            v-model="orderNoFilter"
            placeholder="按订单号搜索"
            clearable
            class="order-filter order-filter--input"
            @keyup.enter="search"
            @clear="search"
          >
            <template #suffix>
              <el-icon
                class="order-search"
                @click="search"
              >
                <Search />
              </el-icon>
            </template>
          </el-input>
          <el-button
            :icon="Refresh"
            @click="load"
          >
            刷新
          </el-button>
        </div>
      </template>

      <app-data-table
        :data="list"
        :loading="loading"
        :min-width="960"
        empty-text="暂无订单"
      >
        <el-table-column
          label="订单号"
          min-width="200"
          prop="orderNo"
        />
        <el-table-column
          label="商品"
          min-width="180"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="openProduct(row.productId)"
            >
              {{ row.productTitle }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column
          label="数量"
          width="70"
          prop="quantity"
        />
        <el-table-column
          label="金额（元）"
          width="110"
        >
          <template #default="{ row }">
            <span class="order-amount">{{ row.amountYuan }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="支付渠道"
          width="90"
        >
          <template #default="{ row }">
            {{ PAYMENT_PROVIDER_TEXT[row.provider as PaymentProvider] }}
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="110"
        >
          <template #default="{ row }">
            <el-tag :type="STATUS_TAG[row.status as OrderStatus]">
              {{ ORDER_STATUS_TEXT[row.status as OrderStatus] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="下单时间"
          width="150"
        >
          <template #default="{ row }">
            <span class="order-muted">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="80"
        >
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="openDetail(row)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </app-data-table>

      <div class="admin-pager">
        <span class="order-muted">共 {{ total }} 笔订单</span>
        <el-pagination
          layout="total, sizes, prev, pager, next"
          :total="total"
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[...PAGE_SIZE_OPTIONS]"
          @size-change="changePageSize"
          @current-change="changePage"
        />
      </div>
    </app-panel>

    <order-detail-drawer
      v-model="detailVisible"
      :order="current"
      :format-date="formatDate"
      @view-product="openProduct"
    />

    <product-preview-dialog
      v-model="productVisible"
      :product-id="productId"
    />
  </section>
</template>

<style scoped>
.order-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.order-filter {
  width: 140px;
}

.order-filter--input {
  width: 220px;
}

.order-search {
  cursor: pointer;
}

.order-amount {
  font-weight: 600;
}

.order-muted {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
