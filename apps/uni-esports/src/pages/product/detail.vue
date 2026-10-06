<template>
  <view
    v-if="product"
    class="detail"
  >
    <view
      class="card cover"
      @tap="previewCover"
    >
      <image
        v-if="product.cover"
        class="cover-image"
        :src="product.cover"
        mode="widthFix"
      />
      <view
        v-else
        class="cover-image cover-fallback"
      >
        <text class="cover-glyph">
          ▲
        </text>
      </view>
    </view>

    <view class="card info">
      <text class="title">
        {{ product.title }}
      </text>

      <view class="platform-grid">
        <view class="platform-card">
          <text
            v-if="discountLabel(product.priceFen, product.originPriceFen)"
            class="platform-discount"
          >
            {{ discountLabel(product.priceFen, product.originPriceFen) }}
          </text>
          <view class="platform-main">
            <view class="platform-icon platform-icon-phone">
              <view class="icon-phone-body" />
            </view>
            <view class="platform-meta">
              <view class="platform-name-row">
                <text class="platform-label">
                  手机端
                </text>
                <text
                  v-if="product.originPriceFen > product.priceFen"
                  class="platform-origin"
                >
                  ¥{{ fenToYuan(product.originPriceFen) }}
                </text>
              </view>
              <text class="platform-price">
                ¥<text class="platform-price-num">
                  {{ fenToYuan(product.priceFen) }}
                </text>
              </text>
            </view>
          </view>
        </view>
        <view class="platform-card">
          <text
            v-if="discountLabel(product.pcPriceFen, product.pcOriginPriceFen)"
            class="platform-discount"
          >
            {{ discountLabel(product.pcPriceFen, product.pcOriginPriceFen) }}
          </text>
          <view class="platform-main">
            <view class="platform-icon platform-icon-pc">
              <view class="icon-pc-body" />
              <view class="icon-pc-base" />
            </view>
            <view class="platform-meta">
              <view class="platform-name-row">
                <text class="platform-label">
                  电脑端
                </text>
                <text
                  v-if="product.pcOriginPriceFen > product.pcPriceFen"
                  class="platform-origin"
                >
                  ¥{{ fenToYuan(product.pcOriginPriceFen) }}
                </text>
              </view>
              <text class="platform-price">
                ¥<text class="platform-price-num">
                  {{ fenToYuan(product.pcPriceFen) }}
                </text>
              </text>
            </view>
          </view>
        </view>
      </view>

      <text class="sold">
        已售 {{ product.sold }}
      </text>
      <view class="category-tag">
        <text class="category-tag-text">
          {{ product.categoryName }}
        </text>
      </view>
    </view>

    <view
      v-if="product.coverTitle || product.coverSub"
      class="card intro"
    >
      <text
        v-if="product.coverTitle"
        class="intro-title"
      >
        {{ product.coverTitle }}
      </text>
      <text
        v-if="product.coverSub"
        class="intro-text"
      >
        {{ product.coverSub }}
      </text>
    </view>

    <view class="card assurances">
      <text
        v-for="item in assurances"
        :key="item"
        class="assurance-item"
      >
        {{ item }}
      </text>
    </view>

    <view
      v-if="product.description"
      class="card desc"
      :class="{ 'desc-expanded': descExpanded }"
    >
      <view class="sec-title">
        <text class="sec-title-text">
          商品详情
        </text>
      </view>
      <view class="desc-content">
        <rich-text
          class="desc-body"
          :nodes="product.description"
        />
        <view
          v-if="!descExpanded"
          class="desc-fade"
        />
      </view>
      <button
        class="desc-toggle"
        @tap="descExpanded = !descExpanded"
      >
        {{ descExpanded ? '收起详情' : '展开详情' }}
      </button>
    </view>

    <product-reviews
      v-if="product.id"
      :product-id="product.id"
    />

    <view class="footer">
      <view class="total">
        <text class="total-label">
          价格
        </text>
        <text class="total-value">
          ¥{{ lowestYuan }}
        </text>
        <text class="total-suffix">
          起
        </text>
      </view>
      <button
        class="buy"
        @tap="goCheckout"
      >
        立即下单
      </button>
    </view>
  </view>
  <empty-state
    v-else-if="!loading"
    text="商品不存在或已下架"
  />
</template>

<script setup lang="ts">
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import type { ProductPublicView } from '@app/contracts';
import { lowestProductPriceFen } from '@app/contracts';
import { commerceApi } from '@/api/commerce.api';
import emptyState from '@/components/empty-state.vue';
import productReviews from '@/components/product-reviews.vue';
import { useAuthStore } from '@/stores/auth.store';
import { fenToYuan } from '@/utils/format';

/** 服务保障条（与 apps/client 的 ProductAssuranceBar 同文案） */
const assurances = ['极速接单', '极速响应', '服务至上', '官方严选'];

const auth = useAuthStore();
const product = ref<ProductPublicView | null>(null);
const loading = ref(true);
const descExpanded = ref(false);

const lowestYuan = computed(() =>
  product.value ? fenToYuan(lowestProductPriceFen(product.value)) : '',
);

/** 折扣角标：与原版一致按现价/原价折算为 N 折 */
function discountLabel(priceFen: number, originPriceFen: number): string {
  if (originPriceFen <= priceFen) {
    return '';
  }
  const discount = (priceFen / originPriceFen) * 10;
  return `${Math.max(discount, 1).toFixed(1).replace(/\.0$/, '')}折`;
}

onShareAppMessage(() => ({
  title: product.value?.title ?? '商品详情',
  path: product.value ? `/pages/product/detail?id=${product.value.id}` : '/pages/home/home',
}));

onLoad(async (options) => {
  const id = options?.id ?? '';
  if (!id) {
    loading.value = false;
    return;
  }
  try {
    product.value = await commerceApi.getProduct(id);
  } catch {
    product.value = null;
  } finally {
    loading.value = false;
  }
});

function previewCover(): void {
  if (!product.value?.cover) {
    return;
  }
  uni.previewImage({ urls: [product.value.cover] });
}

function goCheckout(): void {
  if (!auth.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' });
    return;
  }
  if (!product.value) {
    return;
  }
  uni.navigateTo({ url: `/pages/order/checkout?productId=${product.value.id}` });
}
</script>

<style scoped>
.detail {
  min-height: 100vh;
  padding: 24rpx;
  padding-bottom: 180rpx;
  box-sizing: border-box;
  background:
    radial-gradient(70% 24% at 50% 0%, rgba(255, 176, 32, 0.07), transparent 70%),
    #0b0e14;
}

.cover {
  padding: 0;
  overflow: hidden;
  margin-bottom: 24rpx;
}

.cover-image {
  width: 100%;
  display: block;
  min-height: 320rpx;
  background-color: #071510;
}

.cover-fallback {
  height: 420rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-image: linear-gradient(160deg, #14352a 0%, #0b1f18 60%, #071510 100%);
}

.cover-glyph {
  color: #3dff9b;
  font-size: 96rpx;
  opacity: 0.85;
}

.info {
  margin-bottom: 24rpx;
}

.title {
  display: block;
  color: #e9eef6;
  font-size: 36rpx;
  font-weight: 800;
  line-height: 1.45;
  border-left: 6rpx solid #ffb020;
  padding-left: 20rpx;
}

.platform-grid {
  margin-top: 20rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.platform-card {
  position: relative;
  min-width: 0;
  border: 1rpx solid rgba(255, 176, 32, 0.35);
  border-radius: 8rpx;
  background-color: #10141f;
  padding: 20rpx 20rpx;
}

.platform-discount {
  position: absolute;
  top: 0;
  right: 0;
  color: #1a1205;
  background-color: #ffb020;
  font-size: 20rpx;
  font-weight: 700;
  padding: 2rpx 12rpx;
  border-radius: 0 8rpx 0 8rpx;
}

.platform-main {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.platform-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(255, 176, 32, 0.5);
  background-color: rgba(255, 176, 32, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-phone-body {
  width: 20rpx;
  height: 34rpx;
  border: 2rpx solid #ffb020;
  border-radius: 5rpx;
}

.icon-pc-body {
  width: 32rpx;
  height: 22rpx;
  border: 2rpx solid #ffb020;
  border-radius: 3rpx;
}

.icon-pc-base {
  width: 22rpx;
  height: 2rpx;
  background-color: #ffb020;
  margin-top: 3rpx;
}

.platform-meta {
  flex: 1;
  min-width: 0;
}

.platform-name-row {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.platform-label {
  color: #e9eef6;
  font-size: 24rpx;
  font-weight: 600;
}

.platform-origin {
  color: #67738c;
  font-size: 20rpx;
  text-decoration: line-through;
}

.platform-price {
  margin-top: 4rpx;
  color: #ffb020;
  font-size: 24rpx;
  font-family: 'DIN Alternate', 'Avenir Next Condensed', 'Arial Narrow', sans-serif;
}

.platform-price-num {
  font-size: 44rpx;
  font-weight: 700;
}

.sold {
  display: block;
  margin-top: 16rpx;
  color: #9aa6bb;
  font-size: 24rpx;
}

.category-tag {
  display: inline-block;
  margin-top: 20rpx;
  padding: 6rpx 24rpx;
  background-color: rgba(255, 176, 32, 0.14);
  border: 1rpx solid rgba(255, 176, 32, 0.3);
  clip-path: polygon(12rpx 0, 100% 0, calc(100% - 12rpx) 100%, 0 100%);
}

.category-tag-text {
  color: #ffb020;
  font-size: 22rpx;
  font-weight: 700;
}

.intro {
  margin-bottom: 24rpx;
}

.intro-title {
  display: block;
  color: #e9eef6;
  font-size: 32rpx;
  font-weight: 800;
  line-height: 1.4;
  border-left: 6rpx solid #3dff9b;
  padding-left: 18rpx;
}

.intro-text {
  display: block;
  margin-top: 12rpx;
  color: #9aa6bb;
  font-size: 26rpx;
  line-height: 1.7;
  word-break: break-all;
}

.assurances {
  display: flex;
  align-items: center;
  padding: 22rpx 8rpx;
  margin-bottom: 24rpx;
}

.assurance-item {
  flex: 1;
  text-align: center;
  color: #ffb020;
  font-size: 22rpx;
  border-right: 1rpx solid rgba(150, 165, 195, 0.16);
}

.assurance-item:last-child {
  border-right: none;
}

.sec-title {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.sec-title::before {
  content: '';
  width: 10rpx;
  height: 32rpx;
  background-color: #ffb020;
  transform: skewX(-18deg);
}

.sec-title-text {
  color: #e9eef6;
  font-size: 30rpx;
  font-weight: 800;
  font-style: italic;
  letter-spacing: 2rpx;
}

.desc {
  margin-bottom: 24rpx;
}

.desc-content {
  position: relative;
  margin-top: 18rpx;
  max-height: 340rpx;
  overflow: hidden;
}

.desc-expanded .desc-content {
  max-height: none;
}

.desc-body {
  color: #9aa6bb;
  font-size: 26rpx;
  line-height: 1.7;
  word-break: break-word;
}

.desc-fade {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 116rpx;
  background: linear-gradient(180deg, transparent, #131926);
}

.desc-toggle {
  width: 100%;
  margin-top: 20rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffb020;
  font-size: 26rpx;
  font-weight: 700;
  border: 1rpx solid rgba(150, 165, 195, 0.24);
  border-radius: 8rpx;
}

.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 28rpx;
  padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
  background-color: #131926;
  border-top: 1rpx solid rgba(150, 165, 195, 0.16);
}

.total {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.total-label {
  color: #9aa6bb;
  font-size: 24rpx;
}

.total-value {
  color: #ffb020;
  font-size: 44rpx;
  font-weight: 700;
  font-family: 'DIN Alternate', 'Avenir Next Condensed', 'Arial Narrow', sans-serif;
}

.total-suffix {
  color: #9aa6bb;
  font-size: 24rpx;
}

.buy {
  padding: 0 64rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1a1205;
  font-size: 30rpx;
  font-weight: 800;
  font-style: italic;
  background: linear-gradient(135deg, #ffd066, #ffb020 55%, #e89400);
  clip-path: polygon(20rpx 0, 100% 0, calc(100% - 20rpx) 100%, 0 100%);
}
</style>
