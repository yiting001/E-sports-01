<template>
  <view
    v-if="product"
    class="detail"
  >
    <view class="cover">
      <image
        v-if="product.cover"
        class="cover-image"
        :src="product.cover"
        mode="aspectFill"
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
      <view class="price-row">
        <text class="price">
          ¥{{ lowestYuan }}
        </text>
        <text class="price-origin">
          ¥{{ lowestOriginYuan }}
        </text>
        <text class="sold">
          已售 {{ product.sold }}
        </text>
      </view>
      <text class="title">
        {{ product.title }}
      </text>
      <text
        v-if="product.coverSub"
        class="subtitle"
      >
        {{ product.coverSub }}
      </text>
      <view class="tags">
        <text class="tag">
          {{ product.categoryName }}
        </text>
        <text class="tag tag-neon">
          官方保障
        </text>
      </view>
    </view>

    <view class="card desc">
      <text class="desc-title">
        服务详情
      </text>
      <rich-text
        v-if="product.description"
        class="desc-content"
        :nodes="product.description"
      />
      <empty-state
        v-else
        text="暂无图文详情"
      />
    </view>

    <view class="footer">
      <view
        class="footer-service"
        @tap="gotoService"
      >
        <text class="footer-service-text">
          客服
        </text>
      </view>
      <button
        class="btn-primary footer-buy"
        @tap="gotoCheckout"
      >
        立即购买
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
import { useAuthStore } from '@/stores/auth.store';
import { fenToYuan } from '@/utils/format';

const auth = useAuthStore();
const product = ref<ProductPublicView | null>(null);
const loading = ref(true);

const lowestYuan = computed(() =>
  product.value ? fenToYuan(lowestProductPriceFen(product.value)) : '',
);
const lowestOriginYuan = computed(() =>
  product.value
    ? fenToYuan(Math.min(product.value.originPriceFen, product.value.pcOriginPriceFen))
    : '',
);

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
    if (product.value.title) {
      uni.setNavigationBarTitle({ title: product.value.title });
    }
  } catch {
    product.value = null;
  } finally {
    loading.value = false;
  }
});

function gotoCheckout(): void {
  if (!auth.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' });
    return;
  }
  if (!product.value) {
    return;
  }
  uni.navigateTo({ url: `/pages/order/checkout?productId=${product.value.id}` });
}

function gotoService(): void {
  if (!auth.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' });
    return;
  }
  uni.switchTab({ url: '/pages/message/message' });
}
</script>

<style scoped>
.detail {
  padding-bottom: 140rpx;
}

.cover-image {
  width: 100%;
  height: 520rpx;
  display: block;
  background-color: #071510;
}

.cover-fallback {
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
  margin: 24rpx;
}

.price-row {
  display: flex;
  align-items: baseline;
}

.price {
  color: #ffb020;
  font-size: 44rpx;
  font-weight: 700;
}

.price-origin {
  color: #67738c;
  font-size: 24rpx;
  text-decoration: line-through;
  margin-left: 16rpx;
}

.sold {
  margin-left: auto;
  color: #67738c;
  font-size: 24rpx;
}

.title {
  display: block;
  margin-top: 16rpx;
  color: #e9eef6;
  font-size: 34rpx;
  font-weight: 700;
  line-height: 1.4;
}

.subtitle {
  display: block;
  margin-top: 10rpx;
  color: #9aa6bb;
  font-size: 26rpx;
}

.tags {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}

.tag {
  color: #9aa6bb;
  font-size: 22rpx;
  border: 1rpx solid rgba(150, 165, 195, 0.3);
  border-radius: 6rpx;
  padding: 6rpx 16rpx;
}

.tag-neon {
  color: #3dff9b;
  border-color: rgba(61, 255, 155, 0.4);
}

.desc {
  margin: 0 24rpx 24rpx;
}

.desc-title {
  display: block;
  color: #e9eef6;
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
}

.desc-content {
  color: #9aa6bb;
  font-size: 26rpx;
  line-height: 1.7;
}

.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 20rpx;
  padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
  background-color: #131926;
  border-top: 1rpx solid rgba(150, 165, 195, 0.16);
}

.footer-service {
  width: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(150, 165, 195, 0.3);
  border-radius: 8rpx;
}

.footer-service-text {
  color: #9aa6bb;
  font-size: 26rpx;
}

.footer-buy {
  flex: 1;
}
</style>
