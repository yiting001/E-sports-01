<script setup lang="ts">
import { fenToYuan, type ProductPlatformPrices } from "@app/contracts";

defineProps<{ product: ProductPlatformPrices }>();
</script>

<template>
  <div class="product-platform-prices">
    <div class="platform-price">
      <span class="platform-label">手机端</span>
      <span class="price">¥{{ fenToYuan(product.priceFen) }}</span>
      <span
        v-if="product.originPriceFen > product.priceFen"
        class="origin"
      >¥{{ fenToYuan(product.originPriceFen) }}</span>
    </div>
    <div class="platform-price">
      <span class="platform-label">电脑端</span>
      <span class="price">¥{{ fenToYuan(product.pcPriceFen) }}</span>
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
}

.platform-price {
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 7px;
  padding: 9px 10px;
  border: 1px solid var(--c-border);
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
}

.origin {
  font-family: var(--font-num);
  font-size: 12px;
  color: var(--c-text-muted);
  text-decoration: line-through;
}
</style>
