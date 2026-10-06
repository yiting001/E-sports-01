<template>
  <view
    v-if="product"
    class="checkout"
  >
    <view class="card summary">
      <image
        v-if="product.cover"
        class="summary-cover"
        :src="product.cover"
        mode="aspectFill"
      />
      <view
        v-else
        class="summary-cover summary-cover-fallback"
      >
        <text class="cover-glyph">
          ▲
        </text>
      </view>
      <view class="summary-body">
        <text class="summary-title">
          {{ product.title }}
        </text>
        <text class="summary-price">
          ¥{{ unitYuan }} × {{ quantity }}
        </text>
      </view>
    </view>

    <view class="card section">
      <text class="section-title">
        游戏区服
      </text>
      <view class="region-row">
        <view
          v-for="region in regions"
          :key="region.value"
          class="region-item"
          :class="{ active: region.value === serviceRegion }"
          @tap="serviceRegion = region.value"
        >
          <text
            class="region-text"
            :class="{ 'region-text-active': region.value === serviceRegion }"
          >
            {{ region.label }}
          </text>
        </view>
      </view>

      <text class="section-title">
        数字游戏 ID
      </text>
      <input
        v-model="gameAccountId"
        class="input"
        type="number"
        :maxlength="ORDER_LIMITS.gameAccountIdMax"
        placeholder="必填：1-32 位数字游戏 ID"
        placeholder-class="placeholder"
      >

      <text class="section-title">
        文本游戏 ID（选填）
      </text>
      <input
        v-model="gameTextId"
        class="input"
        :maxlength="ORDER_LIMITS.gameTextIdMax"
        placeholder="如游戏内昵称/文本 ID"
        placeholder-class="placeholder"
      >

      <text class="section-title">
        数量
      </text>
      <view class="quantity-row">
        <button
          class="quantity-btn"
          :disabled="quantity <= ORDER_LIMITS.quantityMin"
          @tap="decrease"
        >
          -
        </button>
        <text class="quantity-value">
          {{ quantity }}
        </text>
        <button
          class="quantity-btn"
          :disabled="quantity >= ORDER_LIMITS.quantityMax"
          @tap="increase"
        >
          +
        </button>
      </view>

      <text class="section-title">
        备注（选填）
      </text>
      <textarea
        v-model="remark"
        class="textarea"
        :maxlength="ORDER_LIMITS.remarkMax"
        placeholder="大区、段位、开黑时间等"
        placeholder-class="placeholder"
        auto-height
      />
    </view>

    <pay-method-picker
      v-model="provider"
      :balance-yuan="balanceYuan"
    />

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
        {{ submitting ? '提交中…' : '提交订单' }}
      </button>
    </view>
  </view>
  <empty-state
    v-else-if="!loading"
    text="商品不存在或已下架"
  />
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import type { ProductPublicView, WechatJsapiPayParams } from '@app/contracts';
import {
  BOOSTER_SERVICE_REGION,
  ORDER_LIMITS,
  OrderBoosterSelectionMode,
  OrderPaymentMethod,
  resolveProductPrice,
} from '@app/contracts';
import { commerceApi } from '@/api/commerce.api';
import { orderApi } from '@/api/order.api';
import { walletApi } from '@/api/wallet.api';
import emptyState from '@/components/empty-state.vue';
import payMethodPicker from '@/components/pay-method-picker.vue';
import { fenToYuan } from '@/utils/format';
import { toast } from '@/utils/toast';

const regions = [
  { value: BOOSTER_SERVICE_REGION.Mobile, label: '手机端' },
  { value: BOOSTER_SERVICE_REGION.Pc, label: '电脑端' },
] as const;

const product = ref<ProductPublicView | null>(null);
const loading = ref(true);
const serviceRegion = ref<string>(BOOSTER_SERVICE_REGION.Mobile);
const quantity = ref(1);
const gameAccountId = ref('');
const gameTextId = ref('');
const remark = ref('');
const provider = ref<OrderPaymentMethod>(OrderPaymentMethod.Balance);
const balanceYuan = ref('0.00');
const submitting = ref(false);

const unitYuan = computed(() => {
  if (!product.value) {
    return '0.00';
  }
  return fenToYuan(resolveProductPrice(product.value, serviceRegion.value).priceFen);
});

const totalYuan = computed(() => {
  if (!product.value) {
    return '0.00';
  }
  const total = resolveProductPrice(product.value, serviceRegion.value).priceFen * quantity.value;
  return fenToYuan(total);
});

onLoad(async (options) => {
  const id = options?.productId ?? '';
  if (!id) {
    loading.value = false;
    return;
  }
  try {
    const [productView, wallet] = await Promise.all([
      commerceApi.getProduct(id),
      walletApi.mine(),
    ]);
    product.value = productView;
    balanceYuan.value = wallet.balanceYuan;
  } catch {
    product.value = null;
  } finally {
    loading.value = false;
  }
});

function decrease(): void {
  quantity.value = Math.max(ORDER_LIMITS.quantityMin, quantity.value - 1);
}

function increase(): void {
  quantity.value = Math.min(ORDER_LIMITS.quantityMax, quantity.value + 1);
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
    toast('请输入 1-32 位数字游戏 ID');
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
      serviceRegion: serviceRegion.value,
      boosterSelectionMode: OrderBoosterSelectionMode.Auto,
      remark: remark.value.trim() || undefined,
    });
    if (result.jsapiParams) {
      await requestWechatPay(result.jsapiParams);
    } else if (result.qrCode) {
      // 渠道仅返回二维码（Native 扫码）时，小程序内不得引导外部扫码支付：
      // 保留待付款订单，引导使用余额支付
      toast('微信支付暂未在小程序开放，可使用余额支付');
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
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.summary-cover {
  width: 160rpx;
  height: 160rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
  background-color: #071510;
}

.summary-cover-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background-image: linear-gradient(160deg, #14352a 0%, #0b1f18 60%, #071510 100%);
}

.cover-glyph {
  color: #3dff9b;
  font-size: 44rpx;
}

.summary-body {
  flex: 1;
  min-width: 0;
}

.summary-title {
  display: block;
  color: #e9eef6;
  font-size: 30rpx;
  font-weight: 600;
  line-height: 1.4;
}

.summary-price {
  display: block;
  margin-top: 12rpx;
  color: #ffb020;
  font-size: 30rpx;
  font-weight: 700;
}

.section {
  margin-bottom: 24rpx;
}

.region-row {
  display: flex;
  gap: 16rpx;
}

.region-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border: 1rpx solid rgba(150, 165, 195, 0.24);
  border-radius: 8rpx;
}

.region-item.active {
  border-color: #ffb020;
  background-color: rgba(255, 176, 32, 0.1);
}

.region-text {
  color: #9aa6bb;
  font-size: 28rpx;
}

.region-text-active {
  color: #ffb020;
  font-weight: 600;
}

.quantity-row {
  display: flex;
  align-items: center;
  gap: 32rpx;
}

.quantity-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(150, 165, 195, 0.3);
  border-radius: 8rpx;
  color: #e9eef6;
  font-size: 36rpx;
}

.quantity-btn[disabled] {
  color: #67738c;
}

.quantity-value {
  min-width: 80rpx;
  text-align: center;
  color: #e9eef6;
  font-size: 32rpx;
  font-weight: 600;
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
