<template>
  <view
    v-if="product"
    class="checkout"
  >
    <view class="card summary">
      <image
        v-if="product.cover"
        class="summary-thumb"
        :src="product.cover"
        mode="aspectFill"
      />
      <view
        v-else
        class="summary-thumb summary-thumb-fallback"
      >
        <text class="thumb-glyph">
          ▲
        </text>
      </view>
      <view class="summary-mid">
        <text class="summary-title">
          {{ product.title }}
        </text>
        <text class="summary-sub">
          {{ product.categoryName }} · 单价 ¥{{ unitYuan }}
        </text>
      </view>
      <text class="summary-price">
        ¥{{ grossYuan }}
      </text>
    </view>

    <checkout-service-form
      v-model:game-account-id="gameAccountId"
      v-model:game-text-id="gameTextId"
      v-model:account-info="accountInfo"
      v-model:service-region="serviceRegion"
      v-model:quantity="quantity"
      v-model:remark="remark"
    />

    <view class="card payment-card">
      <view class="coupon-section">
        <button
          class="coupon-row"
          :disabled="usableCoupons.length === 0"
          @tap="couponListOpen = !couponListOpen"
        >
          <text class="coupon-label">
            优惠券
          </text>
          <text
            class="coupon-text"
            :class="{ active: selectedCoupon }"
          >
            {{ couponRowText }}
          </text>
        </button>
        <view
          v-if="couponListOpen"
          class="coupon-list"
        >
          <button
            v-for="item in usableCoupons"
            :key="item.id"
            class="coupon-opt"
            :class="{ picked: item.id === selectedCouponId }"
            @tap="pickCoupon(item.id)"
          >
            <text class="coupon-title">
              {{ item.title }}
            </text>
            <text class="coupon-off">
              -¥{{ fenToYuan(calcCouponDeductionFen(item.type, item.value, item.thresholdFen, memberAmountFen)) }}
            </text>
          </button>
        </view>
      </view>

      <checkout-payment-methods
        v-model="provider"
        :amount-fen="totalFen"
      />
    </view>

    <view class="footer">
      <view class="footer-amount">
        <text class="footer-amount-label">
          合计
        </text>
        <text class="footer-amount-value">
          ¥{{ totalYuan }}
        </text>
      </view>
      <button
        class="btn-primary footer-submit"
        :class="{ disabled: submitting }"
        @tap="submit"
      >
        {{ submitting ? '提交中…' : '立即下单' }}
      </button>
    </view>
  </view>
  <empty-state
    v-else-if="!loading"
    text="商品信息加载失败，可能已下架"
  />
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import type {
  ProductPublicView,
  UserCouponView,
  WechatJsapiPayParams,
} from '@app/contracts';
import {
  BOOSTER_SERVICE_REGION,
  FEE_RATE_BASE,
  ORDER_LIMITS,
  OrderBoosterSelectionMode,
  OrderPaymentMethod,
  UserCouponStatus,
  calcCouponDeductionFen,
  calcDiscountedFen,
  fenToYuan,
  resolveProductPrice,
} from '@app/contracts';
import { commerceApi } from '@/api/commerce.api';
import { couponApi } from '@/api/coupon.api';
import { memberApi } from '@/api/member.api';
import { orderApi } from '@/api/order.api';
import checkoutPaymentMethods from '@/components/checkout-payment-methods.vue';
import checkoutServiceForm from '@/components/checkout-service-form.vue';
import emptyState from '@/components/empty-state.vue';
import { toast } from '@/utils/toast';

const product = ref<ProductPublicView | null>(null);
const loading = ref(true);
const serviceRegion = ref<string>(BOOSTER_SERVICE_REGION.Mobile);
const quantity = ref(1);
const gameAccountId = ref('');
const gameTextId = ref('');
const accountInfo = ref('');
const remark = ref('');
const provider = ref<OrderPaymentMethod>(OrderPaymentMethod.Balance);
const submitting = ref(false);

const coupons = ref<UserCouponView[]>([]);
const selectedCouponId = ref('');
const couponListOpen = ref(false);
/** 会员折扣（万分比），加载失败时按无折扣计价 */
const discountBp = ref(FEE_RATE_BASE);

const regionPrice = computed(() =>
  product.value
    ? resolveProductPrice(product.value, serviceRegion.value)
    : null,
);

const unitYuan = computed(() => fenToYuan(regionPrice.value?.priceFen ?? 0));
/** 原价小计（单价 × 数量），展示在摘要卡右侧 */
const grossYuan = computed(() =>
  fenToYuan((regionPrice.value?.priceFen ?? 0) * quantity.value),
);

/** 会员折扣后金额（分），优惠券按此金额计算门槛与抵扣 */
const memberAmountFen = computed(() =>
  regionPrice.value
    ? calcDiscountedFen(regionPrice.value.priceFen * quantity.value, discountBp.value)
    : 0,
);

const usableCoupons = computed(() =>
  coupons.value.filter(
    (item) =>
      item.status === UserCouponStatus.Unused &&
      !item.expired &&
      calcCouponDeductionFen(item.type, item.value, item.thresholdFen, memberAmountFen.value) > 0,
  ),
);

const selectedCoupon = computed(
  () => usableCoupons.value.find((item) => item.id === selectedCouponId.value) ?? null,
);

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

const totalFen = computed(() => memberAmountFen.value - couponDeductionFen.value);
const totalYuan = computed(() => fenToYuan(totalFen.value));

const couponRowText = computed(() => {
  if (selectedCoupon.value) {
    return `-¥${fenToYuan(couponDeductionFen.value)}`;
  }
  return usableCoupons.value.length ? `${usableCoupons.value.length} 张可用` : '暂无可用';
});

onLoad(async (options) => {
  const id = options?.productId ?? '';
  if (!id) {
    loading.value = false;
    return;
  }
  const [detailResult, couponResult, memberResult] = await Promise.allSettled([
    commerceApi.getProduct(id),
    couponApi.mine(),
    memberApi.mine(),
  ]);
  if (detailResult.status === 'fulfilled') {
    product.value = detailResult.value;
  } else {
    product.value = null;
  }
  if (couponResult.status === 'fulfilled') {
    coupons.value = couponResult.value;
  }
  if (memberResult.status === 'fulfilled') {
    discountBp.value = memberResult.value.discountBp;
  }
  if (couponResult.status === 'rejected' || memberResult.status === 'rejected') {
    toast('部分优惠信息加载失败，请确认价格后下单');
  }
  loading.value = false;
});

function pickCoupon(id: string): void {
  selectedCouponId.value = selectedCouponId.value === id ? '' : id;
  couponListOpen.value = false;
}

/** wx.requestPayment 拉起收银台（需服务端返回小程序签约的 jsapiParams，见 docs/uni-esports.md） */
function requestWechatPay(params: WechatJsapiPayParams): Promise<void> {
  return new Promise((resolve, reject) => {
    uni.requestPayment({
      provider: 'wxpay',
      // orderInfo 仅为统一类型签名的必填字段；mp-weixin 运行时按下方微信小程序字段转发 wx.requestPayment
      orderInfo: {},
      timeStamp: params.timeStamp,
      nonceStr: params.nonceStr,
      package: params.package,
      signType: params.signType,
      paySign: params.paySign,
      success: () => resolve(),
      fail: (error) => {
        const cancelled = (error.errMsg ?? '').includes('cancel');
        reject(new Error(cancelled ? '已取消支付' : '支付失败'));
      },
    });
  });
}

async function submit(): Promise<void> {
  if (submitting.value || !product.value) {
    return;
  }
  const accountId = gameAccountId.value.trim();
  if (!/^\d{1,32}$/.test(accountId)) {
    toast(`请输入正确的数字游戏 ID（1-${ORDER_LIMITS.gameAccountIdMax} 位数字）`);
    return;
  }
  if (
    accountId.length > ORDER_LIMITS.gameAccountIdMax ||
    (gameTextId.value.trim().length > ORDER_LIMITS.gameTextIdMax)
  ) {
    toast('游戏 ID 超出长度限制');
    return;
  }
  submitting.value = true;
  try {
    const result = await orderApi.create({
      productId: product.value.id,
      quantity: quantity.value,
      provider: provider.value,
      gameAccountId: accountId,
      gameTextId: gameTextId.value.trim() || undefined,
      accountInfo: accountInfo.value.trim() || undefined,
      serviceRegion: serviceRegion.value,
      boosterSelectionMode: OrderBoosterSelectionMode.Auto,
      remark: remark.value.trim() || undefined,
      userCouponId: selectedCoupon.value?.id || undefined,
    });
    if (result.jsapiParams) {
      await requestWechatPay(result.jsapiParams);
    } else if (result.qrCode) {
      // 渠道仅返回二维码（Native 扫码）时，小程序内不得引导外部扫码支付：
      // 保留待付款订单，引导使用余额支付
      toast('该支付方式暂未在小程序开放，可使用钱包余额支付');
    }
    toast(result.paid ? '下单成功' : '订单已创建，待支付');
    uni.redirectTo({ url: `/pages/order/detail?id=${result.orderId}` });
  } catch {
    // 错误已统一提示；保留本页输入
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.checkout {
  padding: 24rpx;
  padding-bottom: 160rpx;
}

.summary {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.summary-thumb {
  width: 140rpx;
  height: 140rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
  background-color: #071510;
}

.summary-thumb-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background-image: linear-gradient(160deg, #14352a 0%, #0b1f18 60%, #071510 100%);
}

.thumb-glyph {
  color: #3dff9b;
  font-size: 44rpx;
}

.summary-mid {
  flex: 1;
  min-width: 0;
}

.summary-title {
  display: block;
  color: #e9eef6;
  font-size: 30rpx;
  font-weight: 600;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-sub {
  display: block;
  margin-top: 10rpx;
  color: #9aa6bb;
  font-size: 24rpx;
}

.summary-price {
  color: #ffb020;
  font-size: 34rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.payment-card {
  margin-bottom: 24rpx;
}

.coupon-section {
  margin-bottom: 24rpx;
}

.coupon-row {
  width: 100%;
  min-height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.coupon-row:disabled {
  opacity: 0.7;
}

.coupon-label {
  color: #e9eef6;
  font-size: 26rpx;
  font-weight: 600;
}

.coupon-text {
  color: #9aa6bb;
  font-size: 26rpx;
}

.coupon-text.active {
  color: #ffb020;
  font-weight: 600;
}

.coupon-list {
  margin-top: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.coupon-opt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 88rpx;
  padding: 0 20rpx;
  border: 1rpx solid rgba(150, 165, 195, 0.24);
  border-radius: 8rpx;
  background-color: #1a2130;
}

.coupon-opt.picked {
  border-color: #ffb020;
  background-color: rgba(255, 176, 32, 0.1);
}

.coupon-title {
  flex: 1;
  min-width: 0;
  color: #e9eef6;
  font-size: 26rpx;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coupon-off {
  color: #ffb020;
  font-size: 26rpx;
  font-weight: 600;
  margin-left: 16rpx;
  flex-shrink: 0;
}

.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
  background-color: #131926;
  border-top: 1rpx solid rgba(150, 165, 195, 0.16);
}

.footer-amount {
  flex: 1;
}

.footer-amount-label {
  color: #9aa6bb;
  font-size: 24rpx;
  margin-right: 12rpx;
}

.footer-amount-value {
  color: #ffb020;
  font-size: 36rpx;
  font-weight: 700;
}

.footer-submit {
  width: 280rpx;
}
</style>
