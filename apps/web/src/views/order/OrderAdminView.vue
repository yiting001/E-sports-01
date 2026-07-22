<script setup lang="ts">
/**
 * 订单管理页：分页检索全量订单（状态/订单号过滤）+ 查看单笔详情。
 * 「待客服处理」订单可下发接单大厅，由打手接单。
 */
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  ORDER_PAYMENT_METHOD_TEXT,
  ORDER_REFUND_STATUS_TEXT,
  ORDER_STATUS_TEXT,
  OrderRefundStatus,
  OrderStatus,
  PAGINATION_DEFAULTS,
  PERMS,
  type AdminOrderView,
  type OrderPaymentMethod,
} from "@app/contracts";
import { ElMessage, ElMessageBox } from "element-plus";
import { Refresh, Search } from "@element-plus/icons-vue";
import AppDataTable from "@/components/common/AppDataTable.vue";
import AppPanel from "@/components/common/AppPanel.vue";
import OrderDetailDrawer from "@/components/order/OrderDetailDrawer.vue";
import OrderRefundActions from "@/components/order/OrderRefundActions.vue";
import AssignBoosterDialog from "@/components/order/AssignBoosterDialog.vue";
import ProductPreviewDialog from "@/components/order/ProductPreviewDialog.vue";
import { PAGE_SIZE_OPTIONS } from "@/config/pagination";
import { orderApi } from "@/api/order.api";
import { useOrderRefundReview } from "@/composables/use-order-refund-review";
import { MENU_BADGE_CODES, useMenuBadgeStore } from "@/stores/menu-badge.store";
import { refundTagType } from "@/utils/order-refund-ui";

const router = useRouter();
const menuBadges = useMenuBadgeStore();

const list = ref<AdminOrderView[]>([]);
const total = ref(0);
const page = ref<number>(PAGINATION_DEFAULTS.page);
const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
const loading = ref(false);
let loadVersion = 0;

const statusFilter = ref<OrderStatus | undefined>(undefined);
const orderNoFilter = ref("");

const detailVisible = ref(false);
const current = ref<AdminOrderView | null>(null);

const productVisible = ref(false);
const productId = ref("");

const assignVisible = ref(false);
const assignTarget = ref<AdminOrderView | null>(null);

/** 打开指派打手弹窗 */
function openAssign(row: AdminOrderView): void {
  assignTarget.value = row;
  assignVisible.value = true;
}

/** 进入订单群：幂等加群后跳转 IM 并选中该群会话 */
async function enterGroup(order: AdminOrderView): Promise<void> {
  const { conversationId } = await orderApi.joinGroup(order.id);
  await router.push({ path: "/im", query: { conversation: conversationId } });
}

/** 点击订单中的商品 → 弹窗预览商品详情 */
function openProduct(id: string): void {
  productId.value = id;
  productVisible.value = true;
}

/** 状态 → 标签颜色（与订单状态机阶段对应） */
const STATUS_TAG: Record<
  OrderStatus,
  "info" | "warning" | "primary" | "success" | "danger"
> = {
  [OrderStatus.PendingPayment]: "warning",
  [OrderStatus.PendingService]: "primary",
  [OrderStatus.Dispatching]: "primary",
  [OrderStatus.Serving]: "primary",
  [OrderStatus.Completed]: "success",
  [OrderStatus.RefundReviewing]: "warning",
  [OrderStatus.Refunded]: "success",
  [OrderStatus.Cancelled]: "info",
};

const statusOptions = Object.values(OrderStatus).map((status) => ({
  label: ORDER_STATUS_TEXT[status],
  value: status,
}));

function formatDate(value: string): string {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function load(): Promise<void> {
  const version = loadVersion + 1;
  loadVersion = version;
  loading.value = true;
  try {
    const res = await orderApi.list(
      page.value,
      pageSize.value,
      statusFilter.value,
      orderNoFilter.value.trim()
    );
    if (version === loadVersion) {
      list.value = res.list;
      total.value = res.total;
    }
  } finally {
    if (version === loadVersion) {
      loading.value = false;
    }
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

function applyUpdatedOrder(updated: AdminOrderView): void {
  const index = list.value.findIndex((item) => item.id === updated.id);
  if (index >= 0) {
    list.value[index] = updated;
  }
  if (current.value?.id === updated.id) {
    current.value = updated;
  }
}

/** 把「待客服处理」订单下发到接单大厅 */
async function dispatch(row: AdminOrderView): Promise<void> {
  await ElMessageBox.confirm(
    `确认把订单 ${row.orderNo} 下发到接单大厅？下发后打手可在大厅接单。`,
    "下发大厅",
    { type: "warning" }
  );
  await orderApi.dispatch(row.id);
  ElMessage.success("已下发接单大厅");
  await refreshAfterOrderChange();
}

async function refreshAfterOrderChange(): Promise<void> {
  await Promise.all([load(), menuBadges.refresh([MENU_BADGE_CODES.order])]);
}

const {
  submittingAction: refundSubmittingAction,
  advanceRefund,
  rejectRefund,
} = useOrderRefundReview({
  onUpdated: applyUpdatedOrder,
  refresh: refreshAfterOrderChange,
});

onMounted(load);
</script>

<template>
  <section class="admin-page order-page">
    <app-panel
      title="订单管理"
      eyebrow="Orders"
      description="用户下单支付后进入「待客服处理」，客服可下发接单大厅由打手接单"
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
        :min-width="1200"
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
          label="支付方式"
          width="90"
        >
          <template #default="{ row }">
            {{ ORDER_PAYMENT_METHOD_TEXT[row.provider as OrderPaymentMethod] }}
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
          label="退款状态"
          width="110"
        >
          <template #default="{ row }">
            <el-tag
              v-if="row.refund"
              :type="refundTagType(row.refund.status)"
            >
              {{
                ORDER_REFUND_STATUS_TEXT[row.refund.status as OrderRefundStatus]
              }}
            </el-tag>
            <span
              v-else
              class="order-muted"
            >-</span>
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
          min-width="360"
        >
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="openDetail(row)"
            >
              详情
            </el-button>
            <el-button
              v-if="row.status === OrderStatus.PendingService"
              v-permission="PERMS.order.dispatch"
              link
              type="warning"
              @click="dispatch(row)"
            >
              下发大厅
            </el-button>
            <el-button
              v-if="
                row.status === OrderStatus.PendingService ||
                  row.status === OrderStatus.Dispatching
              "
              v-permission="PERMS.order.assign"
              link
              type="primary"
              @click="openAssign(row)"
            >
              指派打手
            </el-button>
            <OrderRefundActions
              :order="row"
              :submitting-action="refundSubmittingAction(row.id)"
              @advance="advanceRefund"
              @reject="rejectRefund"
            />
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
      :refund-submitting-action="
        current ? refundSubmittingAction(current.id) : undefined
      "
      @view-product="openProduct"
      @enter-group="enterGroup"
      @advance-refund="advanceRefund"
      @reject-refund="rejectRefund"
    />

    <product-preview-dialog
      v-model="productVisible"
      :product-id="productId"
    />

    <assign-booster-dialog
      v-model="assignVisible"
      :order="assignTarget"
      @assigned="refreshAfterOrderChange"
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
