<script setup lang="ts">
import { fenToYuan, type ProductPlatformPrices } from "@app/contracts";

defineProps<{ product: ProductPlatformPrices }>();

function discountLabel(priceFen: number, originPriceFen: number): string {
  if (originPriceFen <= priceFen) {
    return '';
  }
  const discount = (priceFen / originPriceFen) * 10;
  return `${Math.max(discount, 1).toFixed(1).replace(/\.0$/, '')}折`;
}
</script>

<template>
  <div class="product-platform-prices">
    <div class="platform-price">
      <span class="platform-label">手机端</span>
      <span class="price">¥{{ fenToYuan(product.priceFen) }}</span>
      <span
        v-if="discountLabel(product.priceFen, product.originPriceFen)"
        class="discount"
      >{{ discountLabel(product.priceFen, product.originPriceFen) }}</span>
      <span
        v-if="product.originPriceFen > product.priceFen"
        class="origin"
      >¥{{ fenToYuan(product.originPriceFen) }}</span>
    </div>
    <div class="platform-price">
      <span class="platform-label">电脑端</span>
      <span class="price">¥{{ fenToYuan(product.pcPriceFen) }}</span>
      <span
        v-if="discountLabel(product.pcPriceFen, product.pcOriginPriceFen)"
        class="discount"
      >{{ discountLabel(product.pcPriceFen, product.pcOriginPriceFen) }}</span>
      <span
        v-if="product.pcOriginPriceFen > product.pcPriceFen"
        class="origin"
      >¥{{ fenToYuan(product.pcOriginPriceFen) }}</span>
    </div>
  </div>
</template>

<style scoped>
.product-platform-prices {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 10px;
  background: linear-gradient(90deg, var(--c-accent-dim), transparent 78%);
  border-left: 2px solid var(--c-accent);
  border-radius: var(--radius-sm);
}

.platform-price {
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 7px;
  padding: 9px 10px;
  border: 1px solid color-mix(in srgb, var(--c-accent) 24%, var(--c-border));
  border-radius: var(--radius-sm);
  background: var(--c-surface-2);
}

.platform-label {
  width: 100%;
  font-size: 11px;
  color: var(--c-text-secondary);
}

.price {
  font-family: var(--font-num);
  font-size: 22px;
  font-weight: 800;
  color: var(--c-accent);
  text-shadow: 0 0 18px rgba(255, 176, 32, 0.35);
}

.discount {
  flex-shrink: 0;
  padding: 2px 7px;
  font-size: 11px;
  font-weight: 800;
  color: var(--c-bg);
  background: var(--c-accent);
  clip-path: polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%);
}

.origin {
  font-family: var(--font-num);
  font-size: 12px;
  color: var(--c-text-muted);
  text-decoration: line-through;
}
</style>
