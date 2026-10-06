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

      <view class="platform-prices">
        <view class="platform-row">
          <text class="platform-label">
            手机端
          </text>
          <text
            v-if="product.originPriceFen > product.priceFen"
            class="platform-origin"
          >
            ¥{{ fenToYuan(product.originPriceFen) }}
          </text>
          <text class="platform-price">
            ¥<text class="platform-price-num">
              {{ fenToYuan(product.priceFen) }}
            </text>
          </text>
          <text
            v-if="discountLabel(product.priceFen, product.originPriceFen)"
            class="platform-discount"
          >
            {{ discountLabel(product.priceFen, product.originPriceFen) }}
          </text>
        </view>
        <view class="platform-row">
          <text class="platform-label">
            电脑端
          </text>
          <text
            v-if="product.pcOriginPriceFen > product.pcPriceFen"
            class="platform-origin"
          >
            ¥{{ fenToYuan(product.pcOriginPriceFen) }}
          </text>
          <text class="platform-price">
            ¥<text class="platform-price-num">
              {{ fenToYuan(product.pcPriceFen) }}
            </text>
          </text>
          <text
            v-if="discountLabel(product.pcPriceFen, product.pcOriginPriceFen)"
            class="platform-discount"
          >
            {{ discountLabel(product.pcPriceFen, product.pcOriginPriceFen) }}
          </text>
        </view>
      </view>

      <view class="meta">
        <text class="sold">
          已售 {{ product.sold }}
        </text>
      </view>
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
      <text class="sec-title">
        商品详情
      </text>
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
          ¥{{ lowestYuan }} 起
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
  padding: 24rpx;
  padding-bottom: 160rpx;
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
  font-size: 34rpx;
  font-weight: 700;
  line-height: 1.45;
  border-left: 6rpx solid #ffb020;
  padding-left: 20rpx;
}

.platform-prices {
  margin-top: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.platform-row {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
}

.platform-label {
  width: 110rpx;
  color: #9aa6bb;
  font-size: 26rpx;
  flex-shrink: 0;
}

.platform-origin {
  color: #67738c;
  font-size: 24rpx;
  text-decoration: line-through;
}

.platform-price {
  color: #ffb020;
  font-size: 26rpx;
}

.platform-price-num {
  font-size: 36rpx;
  font-weight: 700;
}

.platform-discount {
  color: #1a1205;
  background-color: #ffb020;
  font-size: 20rpx;
  font-weight: 700;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}

.meta {
  margin-top: 16rpx;
}

.sold {
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
}

.intro {
  margin-bottom: 24rpx;
}

.intro-title {
  display: block;
  color: #e9eef6;
  font-size: 30rpx;
  font-weight: 700;
}

.intro-text {
  display: block;
  margin-top: 10rpx;
  color: #9aa6bb;
  font-size: 26rpx;
  line-height: 1.6;
}

.assurances {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  margin-bottom: 24rpx;
}

.assurance-item {
  color: #3dff9b;
  font-size: 22rpx;
}

.desc {
  margin-bottom: 24rpx;
}

.sec-title {
  display: block;
  color: #e9eef6;
  font-size: 28rpx;
  font-weight: 700;
}

.desc-content {
  position: relative;
  margin-top: 16rpx;
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
}

.buy {
  padding: 0 76rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1a1205;
  font-size: 30rpx;
  font-weight: 700;
  background: linear-gradient(135deg, #ffd066, #ffb020 55%, #e89400);
  clip-path: polygon(20rpx 0, 100% 0, calc(100% - 20rpx) 100%, 0 100%);
}
</style>
