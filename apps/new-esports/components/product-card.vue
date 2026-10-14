<template>
  <view
    class="product"
    @tap="emit('tap')"
  >
    <image
      v-if="cover"
      class="product-cover"
      :src="cover"
      mode="aspectFill"
      lazy-load
    />
    <view
      v-else
      class="product-cover product-cover-fallback"
    >
      <text class="product-cover-initial">
        {{ coverInitial }}
      </text>
    </view>
    <text class="product-title">
      {{ product.title }}
    </text>
    <text
      v-if="product.coverSub"
      class="product-sub"
    >
      {{ product.coverSub }}
    </text>
    <view class="product-foot">
      <text class="type-num product-price">
        {{ priceText }}
      </text>
      <text class="product-start">
        起
      </text>
      <text class="product-sold">
        已售 {{ product.sold }}
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ProductPublicView } from '@/types/commerce';
import { priceLabel } from '@/utils/format';
import { resolveMediaUrl } from '@/utils/media-url';
import { lowestProductPriceFen } from '@/utils/product-price';

/**
 * 商品卡片：影像即卡片（8px 圆角封面 + 紧排文字，无边框无阴影）。
 * 金额从「分」换算展示，未选服务端前按两端最低现价展示「起」价。
 */
const props = defineProps<{
  product: ProductPublicView;
}>();

const emit = defineEmits<{ tap: [] }>();

/** 封面地址需改写（历史数据存在本机绝对地址） */
const cover = computed(() => resolveMediaUrl(props.product.cover));

/** 未选服务端前按两端最低现价展示「起」价 */
const priceText = computed(() => priceLabel(lowestProductPriceFen(props.product)));

/** 无封面时的占位字符（用商品名首字，不做装饰插画） */
const coverInitial = computed(() => props.product.title.trim().slice(0, 1));
</script>

<style scoped>
.product {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.product-cover {
  width: 100%;
  height: 320rpx;
  border-radius: var(--radius-md);
  background-color: var(--c-surface);
}

.product-cover-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-cover-initial {
  color: var(--c-silver);
  font-size: 68rpx;
  font-weight: 400;
  letter-spacing: -1.2px;
}

.product-title {
  margin-top: 20rpx;
  color: var(--c-text);
  font-size: 30rpx;
  font-weight: 400;
  line-height: 1.15;
  letter-spacing: -0.26px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-sub {
  margin-top: 8rpx;
  color: var(--c-text-secondary);
  font-size: 22rpx;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-foot {
  margin-top: 14rpx;
  display: flex;
  align-items: baseline;
}

.product-price {
  color: var(--c-text);
  font-size: 32rpx;
  font-weight: 500;
}

.product-start {
  margin-left: 4rpx;
  color: var(--c-text-secondary);
  font-size: 22rpx;
}

.product-sold {
  margin-left: auto;
  color: var(--c-text-tertiary);
  font-size: 22rpx;
}
</style>
