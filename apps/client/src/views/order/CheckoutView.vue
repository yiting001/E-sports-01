<script setup lang="ts">
/**
 * 下单页（全屏，独立于商品详情页）：商品摘要 + 数量/备注（含图片视频附件）/
 * 账号信息（仅接单打手可见）/支付方式，确认下单后弹出扫码支付
 * （支付宝/微信），支付成功跳「我的订单」。
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
  type RemarkMediaItem,
  type UserCouponView,
} from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import PayDialog from '@/components/order/PayDialog.vue';
import RemarkMediaUploader from '@/components/order/RemarkMediaUploader.vue';
import { commerceApi } from '@/api/commerce.api';
import { couponApi } from '@/api/coupon.api';
import { memberApi } from '@/api/member.api';
import { orderApi } from '@/api/order.api';
import { useToast } from '@/composables/use-toast';
import './CheckoutView.css';
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
/** 备注附件（图片/视频） */
const remarkMedia = ref<RemarkMediaItem[]>([]);
/** 账号信息（仅本人、接单打手与管理端可见） */
const accountInfo = ref('');
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

/** 券抵扣金额（分）：最多抵到 0 元，与后端口径一致 */
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
  return Math.min(Math.max(deduction, 0), memberAmountFen.value);
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
    const result = await orderApi.create({
      productId: product.value.id,
      quantity: quantity.value,
      provider: provider.value,
      remark: remark.value.trim() || undefined,
      remarkMedia: remarkMedia.value.length ? remarkMedia.value : undefined,
      accountInfo: accountInfo.value.trim() || undefined,
      userCouponId: selectedCoupon.value?.id || undefined,
    });
    // 0 元单后端已直接落账，无需扫码支付
    if (result.paid) {
      onPaid();
      return;
    }
    payOrder.value = result;
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
  <div class="checkout client-page">
    <header class="bar">
      <div class="bar-inner">
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
      </div>
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
            <RemarkMediaUploader v-model="remarkMedia" />
          </div>
          <div class="row row--col">
            <span class="label">账号信息</span>
            <textarea
              v-model="accountInfo"
              class="remark"
              :maxlength="ORDER_LIMITS.accountInfoMax"
              placeholder="游戏账号等（选填，仅接单打手可见）"
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
