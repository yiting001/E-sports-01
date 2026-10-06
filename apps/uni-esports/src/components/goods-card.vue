<template>
  <view
    class="goods card"
    @tap="onTap"
  >
    <image
      v-if="product.cover"
      class="goods-cover"
      :src="product.cover"
      mode="aspectFill"
      lazy-load
    />
    <view
      v-else
      class="goods-cover goods-cover-fallback"
    >
      <text class="goods-glyph">
        ▲
      </text>
    </view>
    <view class="goods-body">
      <text class="goods-title">
        {{ product.title }}
      </text>
      <text
        v-if="product.coverSub"
        class="goods-sub"
      >
        {{ product.coverSub }}
      </text>
      <view class="goods-footer">
        <text class="goods-price">
          ¥{{ lowestYuan }}
        </text>
        <text class="goods-price-origin">
          起
        </text>
        <text class="goods-sold">
          已售 {{ product.sold }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ProductPublicView } from '@app/contracts';
import { lowestProductPriceFen } from '@app/contracts';
import { fenToYuan } from '@/utils/format';

const props = defineProps<{
  product: ProductPublicView;
}>();

const emit = defineEmits<{
  tap: [];
}>();

/** 未选择区服前按两端最低现价展示「起」价（与服务端定价口径一致） */
const lowestYuan = computed(() => fenToYuan(lowestProductPriceFen(props.product)));

function onTap(): void {
  emit('tap');
}
</script>

<style scoped>
.goods {
  display: block;
  overflow: hidden;
  min-width: 0;
  max-width: 100%;
  padding: 0;
}

.goods-cover {
  width: 100%;
  height: 260rpx;
  display: block;
  background-color: #071510;
}

.goods-cover-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background-image: linear-gradient(160deg, #14352a 0%, #0b1f18 60%, #071510 100%);
}

.goods-glyph {
  color: #3dff9b;
  font-size: 56rpx;
  opacity: 0.85;
}

.goods-body {
  padding: 20rpx 24rpx 24rpx;
}

.goods-title {
  display: block;
  color: #e9eef6;
  font-size: 30rpx;
  font-weight: 600;
  line-height: 1.4;
}

.goods-sub {
  display: block;
  margin-top: 8rpx;
  color: #9aa6bb;
  font-size: 24rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.goods-footer {
  display: flex;
  align-items: baseline;
  margin-top: 16rpx;
}

.goods-price {
  color: #ffb020;
  font-size: 34rpx;
  font-weight: 700;
}

.goods-price-origin {
  color: #67738c;
  font-size: 22rpx;
  margin-left: 6rpx;
}

.goods-sold {
  margin-left: auto;
  color: #67738c;
  font-size: 22rpx;
}
</style>
