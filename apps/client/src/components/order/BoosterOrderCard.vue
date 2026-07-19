<script setup lang="ts">
/**
 * 打手侧订单卡片：接单大厅与打手订单中心共用。
 * 展示商品快照/数量/备注/金额/状态，通过 actionLabel 渲染可选主操作按钮
 * （大厅传「接单」、订单中心对服务中订单传「完成订单」）；
 * 点击卡片体触发 open 事件供宿主跳转详情；账号信息仅在后端下发时展示（接单后可见）。
 */
import { ORDER_STATUS_TEXT, OrderStatus, type OrderView } from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';

defineProps<{
  order: OrderView;
  /** 主操作按钮文案；为空则不渲染操作区 */
  actionLabel?: string;
  /** 主操作是否禁用；大厅下线时使用，服务端仍执行最终门禁。 */
  actionDisabled?: boolean;
}>();

const emit = defineEmits<{
  action: [order: OrderView];
  open: [order: OrderView];
}>();

/** 状态 → 徽标风格（进行中金色/完成绿色/取消灰色） */
function statusClass(status: OrderStatus): string {
  if (status === OrderStatus.Cancelled) {
    return 'tag--muted';
  }
  if (status === OrderStatus.Completed) {
    return 'tag--ok';
  }
  return 'tag--accent';
}

function formatTime(iso: string): string {
  return iso ? iso.slice(0, 16).replace('T', ' ') : '';
}
</script>

<template>
  <article
    class="order card"
    @click="emit('open', order)"
  >
    <div class="head">
      <span class="no">订单号 {{ order.orderNo }}</span>
      <span
        class="tag"
        :class="statusClass(order.status)"
      >
        {{ ORDER_STATUS_TEXT[order.status] }}
      </span>
    </div>

    <div class="body">
      <div
        class="thumb"
        :class="{ 'thumb--image': order.productCover }"
        :style="order.productCover ? { backgroundImage: `url(${order.productCover})` } : undefined"
      >
        <AppIcon
          v-if="!order.productCover"
          name="gem"
          :size="26"
          class="thumb-icon"
        />
      </div>

      <div class="mid">
        <p class="title">
          {{ order.productTitle }}
        </p>
        <p class="sub">
          <span>数量 ×{{ order.quantity }}</span>
          <span>{{ formatTime(order.createdAt) }}</span>
        </p>
        <p
          v-if="order.remark"
          class="remark"
        >
          备注：{{ order.remark }}
        </p>
        <p
          v-if="order.accountInfo"
          class="remark"
        >
          账号：{{ order.accountInfo }}
        </p>
      </div>

      <span class="amount">¥{{ order.amountYuan }}</span>
    </div>

    <div
      v-if="actionLabel"
      class="actions"
    >
      <button
        class="action"
        :disabled="actionDisabled"
        @click.stop="emit('action', order)"
      >
        {{ actionLabel }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.order {
  padding: 12px 14px;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.no {
  font-family: var(--font-num);
  font-size: 11px;
  color: var(--c-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid currentcolor;
}

.tag--accent {
  color: var(--c-accent);
}

.tag--ok {
  color: var(--c-neon);
}

.tag--muted {
  color: var(--c-text-muted);
}

.body {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.thumb {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: var(--c-cover-bg);
  background-size: cover;
  background-position: center;
  color: var(--c-text-muted);
}

.mid {
  flex: 1;
  min-width: 0;
}

.title {
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub {
  margin-top: 6px;
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--c-text-muted);
}

.remark {
  margin-top: 6px;
  font-size: 12px;
  color: var(--c-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.amount {
  flex-shrink: 0;
  font-family: var(--font-num);
  font-size: 15px;
  font-weight: 800;
  color: var(--c-accent);
}

.actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.action {
  padding: 7px 20px;
  font-size: 13px;
  font-weight: 700;
  color: var(--c-bg);
  background: var(--c-accent);
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}

.action:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
</style>
