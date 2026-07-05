<script setup lang="ts">
/**
 * 下单页（全屏，独立于商品详情页）：商品摘要 + 数量/备注/支付方式，
 * 确认下单后弹出扫码支付（支付宝/微信），支付成功跳「我的订单」。
 */
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ORDER_LIMITS,
  PaymentProvider,
  UserCouponStatus,
  calcCouponDeductionFen,
  calcDiscountedFen,
  fenToYuan,
  type CreateOrderResult,
  type ProductPublicView,
  type UserCouponView,
} from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import PayDialog from '@/components/order/PayDialog.vue';
import { commerceApi } from '@/api/commerce.api';
import { couponApi } from '@/api/coupon.api';
import { memberApi } from '@/api/member.api';
import { orderApi } from '@/api/order.api';
import { useToast } from '@/composables/use-toast';
import './CheckoutView.responsive.css';

/** 支付方式选项（渠道 → 展示文案） */
const PROVIDERS = [
  { value: PaymentProvider.Alipay, label: '支付宝' },
  { value: PaymentProvider.Wechat, label: '微信支付' },
] as const;

const route = useRoute();
const router = useRouter();
const toast = useToast();

const product = ref<ProductPublicView | null>(null);
const loading = ref(true);
const missing = ref(false);

const quantity = ref(1);
const remark = ref('');
const provider = ref<PaymentProvider>(PaymentProvider.Alipay);
const submitting = ref(false);
const payOrder = ref<CreateOrderResult | null>(null);

/** 我的可用优惠券与所选券（空串 = 不使用） */
const coupons = ref<UserCouponView[]>([]);
const selectedCouponId = ref('');
const couponListOpen = ref(false);
/** 当前会员折扣（万分比），与后端计价口径一致 */
const discountBp = ref(0);

/** 会员折后金额（分）：优惠券门槛与抵扣都以此为基数（与后端一致） */
const memberAmountFen = computed(() =>
  product.value
    ? calcDiscountedFen(product.value.priceFen * quantity.value, discountBp.value)
    : 0,
);

/** 按当前金额可用的券（未使用、未过期且达门槛） */
const usableCoupons = computed(() =>
  coupons.value.filter(
    (item) =>
      item.status === UserCouponStatus.Unused &&
      !item.expired &&
      calcCouponDeductionFen(item.type, item.value, item.thresholdFen, memberAmountFen.value) > 0,
  ),
);

const selectedCoupon = computed(() =>
  usableCoupons.value.find((item) => item.id === selectedCouponId.value) ?? null,
);

/** 券抵扣金额（分）：实付至少保留 1 分，与后端口径一致 */
const couponDeductionFen = computed(() => {
  const coupon = selectedCoupon.value;
  if (!coupon) {
    return 0;
  }
  const deduction = calcCouponDeductionFen(
    coupon.type,
    coupon.value,
    coupon.thresholdFen,
    memberAmountFen.value,
  );
  return Math.min(deduction, memberAmountFen.value - 1);
});

/** 应付总额（会员折后再减券抵扣，分 → 元展示） */
const totalYuan = computed(() =>
  fenToYuan(memberAmountFen.value - couponDeductionFen.value),
);

/** 优惠券行文案 */
const couponRowText = computed(() => {
  if (selectedCoupon.value) {
    return `-¥${fenToYuan(couponDeductionFen.value)}`;
  }
  return usableCoupons.value.length
    ? `${usableCoupons.value.length} 张可用`
    : '暂无可用';
});

function pickCoupon(id: string): void {
  selectedCouponId.value = selectedCouponId.value === id ? '' : id;
  couponListOpen.value = false;
}

function changeQuantity(delta: number): void {
  const next = quantity.value + delta;
  if (next >= ORDER_LIMITS.quantityMin && next <= ORDER_LIMITS.quantityMax) {
    quantity.value = next;
  }
}

async function submit(): Promise<void> {
  if (!product.value) {
    return;
  }
  submitting.value = true;
  try {
    payOrder.value = await orderApi.create({
      productId: product.value.id,
      quantity: quantity.value,
      provider: provider.value,
      remark: remark.value.trim() || undefined,
      userCouponId: selectedCoupon.value?.id || undefined,
    });
  } finally {
    submitting.value = false;
  }
}

function onPaid(): void {
  payOrder.value = null;
  toast.show('支付成功，客服将尽快为您安排服务');
  router.replace('/orders');
}

onMounted(async () => {
  try {
    const [detail, mine, member] = await Promise.all([
      commerceApi.getProduct(String(route.params.productId)),
      couponApi.mine(),
      memberApi.mine(),
    ]);
    product.value = detail;
    coupons.value = mine;
    discountBp.value = member.discountBp;
  } catch {
    missing.value = true;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="checkout">
    <header class="bar">
      <button
        class="back"
        aria-label="返回"
        @click="router.back()"
      >
        <AppIcon
          name="chevron"
          :size="20"
        />
      </button>
      <span class="name">确认下单</span>
    </header>

    <div class="scroll">
      <p
        v-if="loading"
        class="hint"
      >
        加载中…
      </p>
      <p
        v-else-if="missing || !product"
        class="hint"
      >
        商品不存在或已下架
      </p>
      <template v-else>
        <section class="card summary">
          <div
            class="thumb"
            :class="{ 'thumb--image': product.cover }"
            :style="product.cover ? { backgroundImage: `url(${product.cover})` } : undefined"
          >
            <AppIcon
              v-if="!product.cover"
              name="gem"
              :size="26"
              class="thumb-icon"
            />
          </div>
          <div class="mid">
            <p class="title">
              {{ product.title }}
            </p>
            <p class="sub">
              {{ product.categoryName }}
            </p>
          </div>
          <span class="price">¥{{ fenToYuan(product.priceFen) }}</span>
        </section>

        <section class="card form">
          <div class="row">
            <span class="label">数量</span>
            <div class="stepper">
              <button
                class="step"
                :disabled="quantity <= ORDER_LIMITS.quantityMin"
                @click="changeQuantity(-1)"
              >
                −
              </button>
              <span class="count">{{ quantity }}</span>
              <button
                class="step"
                :disabled="quantity >= ORDER_LIMITS.quantityMax"
                @click="changeQuantity(1)"
              >
                ＋
              </button>
            </div>
          </div>
          <div class="row row--col">
            <span class="label">备注</span>
            <textarea
              v-model="remark"
              class="remark"
              :maxlength="ORDER_LIMITS.remarkMax"
              placeholder="大区/段位/开黑时间等（选填）"
            />
          </div>
          <div class="row row--col">
            <button
              class="coupon-row"
              :disabled="!usableCoupons.length"
              @click="couponListOpen = !couponListOpen"
            >
              <span class="label">优惠券</span>
              <span
                class="coupon-text"
                :class="{ active: selectedCoupon }"
              >
                {{ couponRowText }}
              </span>
            </button>
            <div
              v-if="couponListOpen"
              class="coupon-list"
            >
              <button
                v-for="item in usableCoupons"
                :key="item.id"
                class="coupon-opt"
                :class="{ picked: item.id === selectedCouponId }"
                @click="pickCoupon(item.id)"
              >
                <span class="coupon-title">{{ item.title }}</span>
                <span class="coupon-off">
                  -¥{{ fenToYuan(calcCouponDeductionFen(item.type, item.value, item.thresholdFen, memberAmountFen)) }}
                </span>
              </button>
            </div>
          </div>
          <div class="row">
            <span class="label">支付方式</span>
            <div class="providers">
              <button
                v-for="opt in PROVIDERS"
                :key="opt.value"
                class="provider"
                :class="{ active: provider === opt.value }"
                @click="provider = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </section>
      </template>
    </div>

    <footer
      v-if="product"
      class="footer"
    >
      <div class="total">
        <span class="total-label">合计</span>
        <span class="total-value">¥{{ totalYuan }}</span>
      </div>
      <button
        class="buy"
        :disabled="submitting"
        @click="submit"
      >
        {{ submitting ? '下单中…' : '确认下单' }}
      </button>
    </footer>

    <PayDialog
      v-if="payOrder"
      :order="payOrder"
      @paid="onPaid"
      @close="payOrder = null"
    />
  </div>
</template>

<style scoped>
.checkout {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(70% 36% at 50% 0%, rgba(255, 176, 32, 0.07), transparent 70%),
    var(--c-bg);
}

.bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-surface);
}

.back {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  color: var(--c-text);
  transform: rotate(180deg);
}

.name {
  font-size: 16px;
  font-weight: 800;
  font-style: italic;
}

.scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hint {
  text-align: center;
  font-size: 13px;
  color: var(--c-text-secondary);
  padding: 24px 0;
}

.coupon-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
}

.coupon-text {
  font-size: 13px;
  color: var(--c-text-secondary);
}

.coupon-text.active {
  color: var(--c-accent);
  font-weight: 700;
}

.coupon-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.coupon-opt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid var(--c-border);
  text-align: left;
}

.coupon-opt.picked {
  border-color: var(--c-accent);
  background: var(--c-accent-dim);
}

.coupon-title {
  font-size: 13px;
  font-weight: 600;
}

.coupon-off {
  font-size: 13px;
  font-weight: 800;
  color: var(--c-accent);
}

.summary {
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary,
.form {
  flex-shrink: 0;
}

.thumb {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: var(--c-cover-bg);
  overflow: hidden;
}

.thumb--image {
  background-size: cover;
  background-position: center;
}

.thumb-icon {
  color: rgba(61, 255, 155, 0.55);
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
  margin-top: 4px;
  font-size: 12px;
  color: var(--c-text-secondary);
}

.price {
  font-family: var(--font-num);
  font-size: 16px;
  font-weight: 800;
  color: var(--c-accent);
}

.form {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.row--col {
  flex-direction: column;
  align-items: stretch;
}

.label {
  font-size: 13px;
  font-weight: 700;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.step {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  color: var(--c-text);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.step:disabled {
  opacity: 0.4;
}

.count {
  min-width: 28px;
  text-align: center;
  font-family: var(--font-num);
  font-weight: 700;
}

.remark {
  min-height: 66px;
  padding: 10px 12px;
  color: var(--c-text);
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
}

.providers {
  display: flex;
  gap: 8px;
}

.provider {
  padding: 7px 14px;
  font-size: 13px;
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.provider.active {
  color: var(--c-accent);
  border-color: var(--c-accent);
  font-weight: 700;
}

.footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--c-border);
  background: var(--c-surface);
}

.total {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.total-label {
  font-size: 12px;
  color: var(--c-text-secondary);
}

.total-value {
  font-family: var(--font-num);
  font-size: 22px;
  font-weight: 800;
  color: var(--c-accent);
}

.buy {
  padding: 11px 34px;
  font-size: 15px;
  font-weight: 800;
  font-style: italic;
  color: var(--c-bg);
  background: var(--c-accent);
  border-radius: var(--radius-sm);
}

.buy:disabled {
  opacity: 0.6;
}
</style>
