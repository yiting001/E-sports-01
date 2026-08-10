<script setup lang="ts">
/**
 * 打手侧订单卡片：接单大厅与打手订单中心共用。
 * 展示商品快照/数量/备注/金额/状态/佣金，通过 actionLabel 渲染可选主操作按钮
 * （大厅传「接单」、订单中心对服务中订单传「完成订单」）；
 * 点击卡片体触发 open 事件供宿主跳转详情；账号信息仅在后端下发时展示（接单后可见）。
 *
 * 佣金展示规则：
 * - 接单大厅（未接单状态）：显示订单金额 + 预估佣金
 * - 订单中心（已接单/已完成）：显示订单金额 + 实际佣金
 */
import { computed } from 'vue';
import {
  BOOSTER_SERVICE_REGIONS,
  ORDER_STATUS_TEXT,
  OrderStatus,
  fenToYuan,
  type OrderView,
} from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import RemarkMediaGallery from '@/components/order/RemarkMediaGallery.vue';

const props = withDefaults(
  defineProps<{
    order: OrderView;
    /** 主操作按钮文案；为空则不渲染操作区 */
    actionLabel?: string;
    /** 主操作是否禁用；大厅下线时使用，服务端仍执行最终门禁。 */
    actionDisabled?: boolean;
    /** 是否显示佣金；未传时默认显示（Boolean prop 缺省会被 Vue 转为 false，须用 withDefaults 声明） */
    showCommission?: boolean;
    /** 订单未携带费率时的兼容预估费率（万分比，如打手自身等级费率） */
    fallbackRateBp?: number;
  }>(),
  { actionLabel: '', actionDisabled: false, showCommission: true, fallbackRateBp: 0 }
);

const emit = defineEmits<{
  action: [order: OrderView];
  open: [order: OrderView];
}>();

/** 状态 → 徽标风格（进行中金色/完成绿色/取消灰色） */
function statusClass(status: OrderStatus): string {
  if (status === OrderStatus.Cancelled) {
    return "tag--muted";
  }
  if (status === OrderStatus.Completed) {
    return "tag--ok";
  }
  return "tag--accent";
}

function formatTime(iso: string): string {
  return iso ? iso.slice(0, 16).replace("T", " ") : "";
}

function serviceRegionText(value: OrderView["serviceRegion"]): string {
  if (!value) {
    return "区服待确认";
  }
  const label = BOOSTER_SERVICE_REGIONS.find(
    (item) => item.value === value
  )?.label;
  return label?.replace(/^三角洲\s*-\s*/, "") ?? value;
}

/** 佣金金额（元）：已结算取实际佣金，否则按订单费率/兼容费率预估；无法计算时为空 */
const commissionYuan = computed(() => {
  if (!props.showCommission) return '';

  if (props.order.commissionFen > 0) {
    return fenToYuan(props.order.commissionFen);
  }

  const rateBp =
    props.order.commissionRateBp > 0
      ? props.order.commissionRateBp
      : (props.fallbackRateBp ?? 0);
  if (rateBp > 0) {
    const estCommissionFen = Math.round(
      (props.order.amountFen * rateBp) / 10000
    );
    return fenToYuan(estCommissionFen);
  }

  return '';
});

/** 佣金栏标题：已结算显示「到手佣金」，未结算显示「可得佣金」 */
const commissionLabel = computed(() =>
  props.order.commissionFen > 0 ? '到手佣金' : '可得佣金'
);
</script>

<script lang="ts">
export default {
  inheritAttrs: false,
};
</script>

<template>
  <article
    class="order card"
    @click="emit('open', order)"
  >
    <div class="body">
      <div
        class="thumb"
        :class="{ 'thumb--image': order.productCover }"
        :style="
          order.productCover
            ? { backgroundImage: `url(${order.productCover})` }
            : undefined
        "
      >
        <AppIcon
          v-if="!order.productCover"
          name="gem"
          :size="26"
          class="thumb-icon"
        />
      </div>

      <div class="mid">
        <p
          class="title"
          :title="order.productTitle"
        >
          {{ order.productTitle }}
        </p>
        <p class="sub">
          下发 {{ formatTime(order.dispatchedAt || order.createdAt) }}
        </p>
      </div>

      <span
        class="tag"
        :class="statusClass(order.status)"
      >
        {{ ORDER_STATUS_TEXT[order.status] }}
      </span>
    </div>

    <div class="no-row">
      <span class="no">单号 {{ order.orderNo }}</span>
    </div>

    <div class="pay-banner">
      <div class="pay-cell">
        <span class="pay-label">订单金额</span>
        <span class="pay-amount">¥{{ order.amountYuan }}</span>
      </div>
      <span class="pay-bolt">
        <AppIcon
          name="bolt"
          :size="16"
        />
      </span>
      <div class="pay-cell pay-cell--right">
        <span class="pay-label">{{ commissionLabel }}</span>
        <span
          v-if="commissionYuan"
          class="pay-commission"
        >+¥{{ commissionYuan }}</span>
        <span
          v-else
          class="pay-commission pay-commission--muted"
        >接单后结算</span>
      </div>
    </div>

    <dl class="info">
      <div class="info-row">
        <dt>
          <span class="info-icon"><AppIcon
            name="box"
            :size="13"
          /></span>
          数量/大区
        </dt>
        <dd>{{ order.quantity }}件 · {{ serviceRegionText(order.serviceRegion) }}</dd>
      </div>
      <div class="info-row">
        <dt>
          <span class="info-icon"><AppIcon
            name="user"
            :size="13"
          /></span>
          游戏昵称
        </dt>
        <dd :class="order.gameTextId ? 'info-plain' : 'info-muted'">
          {{ order.gameTextId || '接单后显示' }}
        </dd>
      </div>
      <div class="info-row">
        <dt>
          <span class="info-icon"><AppIcon
            name="gamepad"
            :size="13"
          /></span>
          游戏ID
        </dt>
        <dd :class="order.gameAccountId ? 'info-plain' : 'info-muted'">
          {{ order.gameAccountId || '接单后显示' }}
        </dd>
      </div>
      <div
        v-if="order.accountInfo"
        class="info-row"
      >
        <dt>
          <span class="info-icon"><AppIcon
            name="card"
            :size="13"
          /></span>
          账号
        </dt>
        <dd class="info-plain">
          {{ order.accountInfo }}
        </dd>
      </div>
      <div
        v-if="order.remark"
        class="info-row info-row--remark"
      >
        <dt>
          <span class="info-icon"><AppIcon
            name="chat"
            :size="13"
          /></span>
          备注
        </dt>
        <dd class="info-plain">
          {{ order.remark }}
        </dd>
      </div>
      <div
        v-if="order.remarkMedia.length"
        class="info-row info-row--remark info-row--media"
        @click.stop
      >
        <dt>
          <span class="info-icon"><AppIcon
            name="card"
            :size="13"
          /></span>
          备注图片
        </dt>
        <dd class="info-plain">
          <RemarkMediaGallery :items="order.remarkMedia" />
        </dd>
      </div>
    </dl>

    <div
      v-if="actionLabel"
      class="actions"
    >
      <span
        v-if="commissionYuan"
        class="income"
      >¥{{ commissionYuan }} 入账</span>
      <span v-else />
      <button
        class="action"
        :disabled="actionDisabled"
        @click.stop="emit('action', order)"
      >
        <AppIcon
          name="bolt"
          :size="14"
        />
        {{ actionLabel }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.order {
  padding: 12px 14px;
}

.no-row {
  margin-top: 10px;
  padding: 8px 0;
  border-top: 1px solid var(--c-border);
  border-bottom: 1px solid var(--c-border);
}

.no {
  font-family: var(--font-num);
  font-size: 12px;
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
  font-size: 12px;
  color: var(--c-text-muted);
}

.pay-banner {
  margin-top: 10px;
  display: flex;
  align-items: center;
  padding: 13px 14px;
  border-radius: 12px;
  background: linear-gradient(100deg, #2c2a72, #4a2f8f 55%, #7a2c6f);
  border: 1px solid color-mix(in srgb, #7a5cff 40%, transparent);
}

.pay-cell {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pay-cell--right {
  align-items: flex-end;
  text-align: right;
}

.pay-bolt {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  margin: 0 10px;
  border-radius: 50%;
  color: #ffd257;
  background: rgba(255, 255, 255, 0.12);
}

.pay-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.72);
}

.pay-amount {
  font-family: var(--font-num);
  font-size: 21px;
  font-weight: 800;
  color: #fff;
}

.pay-commission {
  font-family: var(--font-num);
  font-size: 21px;
  font-weight: 800;
  color: #ffd257;
}

.pay-commission--muted {
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.72);
}

.info {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--c-cover-bg) 60%, transparent);
  font-size: 12px;
}

.info-row dt {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--c-text-muted);
}

.info-icon {
  display: inline-flex;
  color: var(--c-accent);
}

.info-row--remark {
  background: color-mix(in srgb, var(--c-accent) 12%, transparent);
}

.info-row--remark dt {
  align-self: flex-start;
}

.info-row dd {
  min-width: 0;
  text-align: right;
  color: var(--c-text);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-row--remark dd {
  white-space: normal;
  word-break: break-word;
}

.info-row--remark dd.info-plain {
  color: color-mix(in srgb, var(--c-accent) 80%, var(--c-text));
}

.info-row--media {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.info-row--media dd {
  width: 100%;
  text-align: left;
  white-space: normal;
}

.info-row dd.info-muted {
  color: var(--c-text-muted);
  font-style: italic;
  font-weight: 400;
}

.info-row dd.info-plain {
  color: var(--c-text);
}

.actions {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.income {
  font-family: var(--font-num);
  font-size: 16px;
  font-weight: 800;
  color: var(--c-accent);
}

.action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 26px;
  font-size: 14px;
  font-weight: 800;
  color: #fff;
  border-radius: 999px;
  background: linear-gradient(100deg, #ff7a3c, #f5317f);
  box-shadow: 0 4px 14px rgba(245, 49, 127, 0.35);
}

.action:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
</style>
