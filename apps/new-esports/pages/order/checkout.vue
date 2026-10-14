<template>
  <view class="checkout">
    <template v-if="product">
      <!-- 商品摘要 -->
      <view class="summary">
        <image
          v-if="cover"
          class="summary-cover"
          :src="cover"
          mode="aspectFill"
        />
        <view class="summary-info">
          <text class="type-body summary-title">
            {{ product.title }}
          </text>
          <text class="type-small text-muted summary-sub">
            {{ product.categoryName }}
          </text>
          <text class="type-num summary-price">
            ¥{{ unitYuan }} <text class="summary-unit">/ 单</text>
          </text>
        </view>
      </view>

      <!-- 服务信息 -->
      <view class="section">
        <text class="type-label section-title">
          服务信息
        </text>

        <view class="field">
          <text class="type-label field-label">
            服务端
          </text>
          <view class="region-row">
            <view
              v-for="region in regions"
              :key="region.value"
              class="region"
              :class="{ 'region--active': serviceRegion === region.value }"
              @tap="serviceRegion = region.value"
            >
              <text
                class="region-text"
                :class="{ 'region-text--active': serviceRegion === region.value }"
              >
                {{ region.label }}
              </text>
            </view>
          </view>
          <text class="type-small text-faint field-hint">
            手机端/电脑端价格不同，按所选服务端结算
          </text>
        </view>

        <view class="field">
          <text class="type-label field-label">
            数字游戏 ID
          </text>
          <input
            v-model="gameAccountId"
            class="input"
            type="number"
            :maxlength="ORDER_LIMITS.gameAccountIdMax"
            placeholder="接单打手按此 ID 上号，请仔细核对"
            placeholder-class="placeholder"
          >
        </view>

        <view class="field">
          <text class="type-label field-label">
            文本游戏 ID（选填）
          </text>
          <input
            v-model="gameTextId"
            class="input"
            type="text"
            :maxlength="ORDER_LIMITS.gameTextIdMax"
            placeholder="游戏内昵称等，便于打手确认"
            placeholder-class="placeholder"
          >
        </view>

        <view class="field">
          <text class="type-label field-label">
            账号信息（选填）
          </text>
          <input
            v-model="accountInfo"
            class="input"
            type="text"
            :maxlength="ORDER_LIMITS.accountInfoMax"
            placeholder="仅本人、接单打手与管理端可见"
            placeholder-class="placeholder"
          >
        </view>

        <view class="field">
          <text class="type-label field-label">
            数量
          </text>
          <view class="quantity">
            <view
              class="quantity-btn"
              :class="{ 'quantity-btn--disabled': quantity <= ORDER_LIMITS.quantityMin }"
              @tap="changeQuantity(-1)"
            >
              <text>−</text>
            </view>
            <text class="type-num quantity-value">{{ quantity }}</text>
            <view
              class="quantity-btn"
              :class="{ 'quantity-btn--disabled': quantity >= ORDER_LIMITS.quantityMax }"
              @tap="changeQuantity(1)"
            >
              <text>＋</text>
            </view>
          </view>
        </view>

        <view class="field">
          <text class="type-label field-label">
            打手安排
          </text>
          <view class="mode-row">
            <text class="type-body mode-text">
              自动安排（按接单大厅匹配）
            </text>
            <text
              class="btn-text mode-action"
              @tap="onSpecifiedTap"
            >
              指定打手
            </text>
          </view>
        </view>

        <view class="field field--last">
          <text class="type-label field-label">
            备注（选填）
          </text>
          <textarea
            v-model="remark"
            class="textarea"
            :maxlength="ORDER_LIMITS.remarkMax"
            placeholder="大区、段位、开黑时间等"
            placeholder-class="placeholder"
          />
        </view>
      </view>

      <!-- 计价：单价 × 数量 → 会员折扣 → 应付 -->
      <view class="section">
        <text class="type-label section-title">
          费用明细
        </text>
        <view class="price-row">
          <text class="type-small text-muted">单价 × {{ quantity }}</text>
          <text class="type-num price-value">¥{{ grossYuan }}</text>
        </view>
        <view
          v-if="discountBp < FEE_RATE_BASE"
          class="price-row"
        >
          <text class="type-small text-muted">会员折扣（{{ discountLabel(discountBp) }}）</text>
          <text class="type-num price-value">-¥{{ discountYuan }}</text>
        </view>
        <view class="price-row price-row--total">
          <text class="type-label text-dim">应付</text>
          <text class="type-num price-total">¥{{ totalYuan }}</text>
        </view>
      </view>

      <!-- 支付方式：余额支付可用；渠道支付依赖服务端小程序支付渠道 -->
      <view class="section">
        <text class="type-label section-title">
          支付方式
        </text>
        <view class="pay-row">
          <view class="pay-main">
            <text class="type-body pay-name">
              余额支付
            </text>
            <text class="type-small text-muted pay-desc">
              余额 ¥{{ balanceYuan }}{{ balanceInsufficient ? ' · 不足' : '' }}
            </text>
          </view>
          <view class="pay-radio pay-radio--checked">
            <text class="pay-tick">✓</text>
          </view>
        </view>
        <view class="pay-row pay-row--disabled">
          <view class="pay-main">
            <text class="type-body pay-name pay-name--disabled">
              微信支付
            </text>
            <text class="type-small text-faint pay-desc">
              随服务端小程序支付渠道开通后开放
            </text>
          </view>
        </view>
      </view>
    </template>

    <view
      v-else-if="!loading"
      class="empty"
    >
      商品不存在或已下架
    </view>

    <!-- 底部提交条 -->
    <view
      v-if="product"
      class="footer"
    >
      <view class="footer-total">
        <text class="type-label">应付</text>
        <text class="type-num footer-value">¥{{ totalYuan }}</text>
      </view>
      <view
        class="btn-primary footer-submit"
        :class="{ 'is-disabled': !canSubmit }"
        @tap="submit"
      >
        <text>{{ submitting ? '提交中…' : '提交订单' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { commerceApi } from '@/api/commerce.api';
import { orderApi } from '@/api/order.api';
import { member } from '@/stores/member';
import { wallet } from '@/stores/wallet';
import { BOOSTER_SERVICE_REGIONS, BOOSTER_SERVICE_REGION } from '@/types/booster';
import type { ProductPublicView } from '@/types/commerce';
import { ORDER_LIMITS, OrderBoosterSelectionMode, OrderPaymentMethod } from '@/types/order';
import { discountLabel, fenToYuan } from '@/utils/format';
import { calcDiscountedFen, FEE_RATE_BASE } from '@/utils/member';
import { resolveMediaUrl } from '@/utils/media-url';
import { resolveProductPrice } from '@/utils/product-price';
import { toast } from '@/utils/toast';

/**
 * 下单页：商品摘要 → 服务信息（服务端/游戏 ID/账号信息/数量/打手安排/备注）→ 费用明细 → 支付方式。
 * 计价口径与 apps/client 一致：按所选服务端取单价，乘数量后套用会员折扣（向上取整）。
 * 支付方式当前只开放余额支付（渠道支付需服务端小程序支付渠道，未开通时不给出不可用按钮）。
 */

const regions = BOOSTER_SERVICE_REGIONS.map((item) => ({
  value: item.value,
  label: item.label.replace('三角洲 - ', ''),
}));

const product = ref<ProductPublicView | null>(null);
const loading = ref(true);
const submitting = ref(false);

const serviceRegion = ref<string>(BOOSTER_SERVICE_REGION.Mobile);
const quantity = ref(1);
const gameAccountId = ref('');
const gameTextId = ref('');
const accountInfo = ref('');
const remark = ref('');

const discountBp = computed(() => member.mine.value?.discountBp ?? FEE_RATE_BASE);
const balanceFen = computed(() => wallet.mine.value?.balanceFen ?? 0);
const balanceYuan = computed(() => fenToYuan(balanceFen.value));

const cover = computed(() => resolveMediaUrl(product.value?.cover ?? ''));

/** 按所选服务端解析单价 */
const regionPrice = computed(() =>
  product.value ? resolveProductPrice(product.value, serviceRegion.value) : null,
);

const unitYuan = computed(() => fenToYuan(regionPrice.value?.priceFen ?? 0));
/** 折前小计（单价 × 数量） */
const grossFen = computed(() => (regionPrice.value?.priceFen ?? 0) * quantity.value);
const grossYuan = computed(() => fenToYuan(grossFen.value));
/** 会员折扣后应付（分） */
const totalFen = computed(() => calcDiscountedFen(grossFen.value, discountBp.value));
const totalYuan = computed(() => fenToYuan(totalFen.value));
const discountYuan = computed(() => fenToYuan(grossFen.value - totalFen.value));

const balanceInsufficient = computed(
  () => Boolean(wallet.mine.value) && balanceFen.value < totalFen.value,
);

const canSubmit = computed(
  () =>
    Boolean(product.value) &&
    !submitting.value &&
    /^\d{1,32}$/.test(gameAccountId.value.trim()) &&
    !balanceInsufficient.value,
);

onLoad(async (options?: Record<string, string>) => {
  const id = options?.productId ?? '';
  if (!id) {
    loading.value = false;
    return;
  }
  const [productResult] = await Promise.allSettled([
    commerceApi.getProduct(id),
    member.refresh(),
    wallet.refresh(),
  ]);
  product.value = productResult.status === 'fulfilled' ? productResult.value : null;
  loading.value = false;
  if (product.value) {
    uni.setNavigationBarTitle({ title: '确认下单' });
  }
});

function changeQuantity(delta: number): void {
  const next = quantity.value + delta;
  if (next < ORDER_LIMITS.quantityMin || next > ORDER_LIMITS.quantityMax) {
    return;
  }
  quantity.value = next;
}

/** 指定打手需要打手目录（小程序端未接入），给出明确出口而不是静默无响应 */
function onSpecifiedTap(): void {
  toast('小程序端暂不支持挑选打手，将按接单大厅自动匹配');
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
  if (balanceInsufficient.value) {
    toast('账户余额不足，请联系客服充值后再下单');
    return;
  }
  submitting.value = true;
  try {
    const result = await orderApi.create({
      productId: product.value.id,
      quantity: quantity.value,
      provider: OrderPaymentMethod.Balance,
      gameAccountId: accountId,
      gameTextId: gameTextId.value.trim() || undefined,
      accountInfo: accountInfo.value.trim() || undefined,
      serviceRegion: serviceRegion.value,
      boosterSelectionMode: OrderBoosterSelectionMode.Auto,
      remark: remark.value.trim() || undefined,
    });
    toast(result.paid ? '下单成功' : '订单已创建，待支付');
    uni.redirectTo({ url: '/pages/order/list' });
  } catch {
    // 接口错误已统一提示，保留本页输入便于修改后重试
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.checkout {
  padding: 24rpx 32rpx 220rpx;
  box-sizing: border-box;
}

/* ===== 商品摘要：影像 + 紧排文字 ===== */
.summary {
  display: flex;
  align-items: center;
}

.summary-cover {
  width: 160rpx;
  height: 160rpx;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background-color: var(--c-surface);
}

.summary-info {
  flex: 1;
  min-width: 0;
  margin-left: 28rpx;
}

.summary-title {
  display: block;
  color: var(--c-text);
}

.summary-sub {
  display: block;
  margin-top: 8rpx;
}

.summary-price {
  display: block;
  margin-top: 16rpx;
  color: var(--c-text);
  font-size: 34rpx;
  font-weight: 500;
}

.summary-unit {
  font-size: 22rpx;
  color: var(--c-text-secondary);
}

/* ===== 区块 ===== */
.section {
  margin-top: 48rpx;
  padding-top: 32rpx;
  border-top: 1rpx solid var(--c-border);
}

.section-title {
  color: var(--c-text);
}

.field {
  margin-top: 32rpx;
}

.field-label {
  display: block;
  margin-bottom: 16rpx;
}

.field-hint {
  display: block;
  margin-top: 12rpx;
}

.field--last {
  margin-bottom: 8rpx;
}

/* 服务端选择：两项并排，选中以白描边 + 白字表示 */
.region-row {
  display: flex;
}

.region {
  padding: 20rpx 32rpx;
  margin-right: 20rpx;
  border: 1rpx solid var(--c-border);
  border-radius: var(--radius-md);
}

.region--active {
  border-color: var(--c-text);
}

.region-text {
  color: var(--c-text-secondary);
  font-size: 28rpx;
}

.region-text--active {
  color: var(--c-text);
}

/* 数量步进器 */
.quantity {
  display: flex;
  align-items: center;
}

.quantity-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid var(--c-border);
  border-radius: var(--radius-xs);
  color: var(--c-text);
  font-size: 32rpx;
}

.quantity-btn--disabled {
  color: var(--c-text-tertiary);
}

.quantity-value {
  min-width: 120rpx;
  text-align: center;
  color: var(--c-text);
  font-size: 34rpx;
}

.mode-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mode-text {
  color: var(--c-text);
  flex: 1;
  min-width: 0;
}

.mode-action {
  flex-shrink: 0;
  margin-left: 24rpx;
  color: var(--c-text-secondary);
}

/* ===== 费用明细 ===== */
.price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24rpx;
}

.price-value {
  color: var(--c-text);
  font-size: 30rpx;
}

.price-row--total {
  margin-top: 32rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid var(--c-border);
}

.price-total {
  color: var(--c-text);
  font-size: 48rpx;
  font-weight: 500;
  line-height: 1;
}

/* ===== 支付方式 ===== */
.pay-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24rpx;
  padding: 28rpx;
  border: 1rpx solid var(--c-border);
  border-radius: var(--radius-md);
}

.pay-row--disabled {
  opacity: 0.6;
}

.pay-main {
  flex: 1;
  min-width: 0;
}

.pay-name {
  display: block;
  color: var(--c-text);
}

.pay-name--disabled {
  color: var(--c-text-secondary);
}

.pay-desc {
  display: block;
  margin-top: 8rpx;
}

.pay-radio {
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid var(--c-border);
  border-radius: 50%;
  margin-left: 24rpx;
}

.pay-radio--checked {
  background-color: var(--c-text);
  border-color: var(--c-text);
}

.pay-tick {
  color: #000000;
  font-size: 22rpx;
  line-height: 1;
}

/* ===== 底部提交条 ===== */
.footer {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  background-color: #000000;
  border-top: 1rpx solid var(--c-border);
}

.footer-total {
  display: flex;
  align-items: baseline;
}

.footer-value {
  margin-left: 12rpx;
  color: var(--c-text);
  font-size: 44rpx;
  font-weight: 500;
}

.footer-submit {
  width: 300rpx;
}
</style>
