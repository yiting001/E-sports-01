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
      <span class="corner corner-tl" />
      <span class="corner corner-br" />
      <span
        class="platform-icon"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
        >
          <rect
            x="7"
            y="3"
            width="10"
            height="18"
            rx="2"
          />
          <line
            x1="10.5"
            y1="18"
            x2="13.5"
            y2="18"
          />
        </svg>
      </span>
      <span class="platform-meta">
        <span class="platform-label">手机端</span>
        <span class="platform-sub">MOBILE</span>
      </span>
      <span class="price-row">
        <span class="price">
          ¥<b>{{ fenToYuan(product.priceFen) }}</b>
        </span>
        <span
          v-if="discountLabel(product.priceFen, product.originPriceFen)"
          class="discount"
        >{{ discountLabel(product.priceFen, product.originPriceFen) }}</span>
        <span
          v-if="product.originPriceFen > product.priceFen"
          class="origin"
        >¥{{ fenToYuan(product.originPriceFen) }}</span>
      </span>
    </div>
    <div class="platform-price">
      <span class="corner corner-tl" />
      <span class="corner corner-br" />
      <span
        class="platform-icon"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
        >
          <rect
            x="3"
            y="4"
            width="18"
            height="12"
            rx="1.5"
          />
          <line
            x1="9"
            y1="20"
            x2="15"
            y2="20"
          />
          <line
            x1="12"
            y1="16"
            x2="12"
            y2="20"
          />
        </svg>
      </span>
      <span class="platform-meta">
        <span class="platform-label">电脑端</span>
        <span class="platform-sub">PC</span>
      </span>
      <span class="price-row">
        <span class="price">
          ¥<b>{{ fenToYuan(product.pcPriceFen) }}</b>
        </span>
        <span
          v-if="discountLabel(product.pcPriceFen, product.pcOriginPriceFen)"
          class="discount"
        >{{ discountLabel(product.pcPriceFen, product.pcOriginPriceFen) }}</span>
        <span
          v-if="product.pcOriginPriceFen > product.pcPriceFen"
          class="origin"
        >¥{{ fenToYuan(product.pcOriginPriceFen) }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.product-platform-prices {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.platform-price {
  position: relative;
  overflow: hidden;
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: auto auto;
  align-items: center;
  column-gap: 12px;
  row-gap: 5px;
  padding: 13px 12px;
  border: 1px solid color-mix(in srgb, var(--c-accent) 38%, var(--c-border));
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(255, 176, 32, 0.1), transparent 42%),
    linear-gradient(160deg, #1c2230, #10141d 70%);
  box-shadow: inset 0 1px 0 rgba(255, 224, 160, 0.08);
}

.corner {
  position: absolute;
  width: 44px;
  height: 44px;
  pointer-events: none;
}

.corner-tl {
  top: 0;
  left: 0;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--c-accent) 55%, transparent) 0,
    transparent 46%
  );
  clip-path: polygon(0 0, 100% 0, 0 100%);
}

.corner-br {
  right: 0;
  bottom: 0;
  background: linear-gradient(
    -45deg,
    color-mix(in srgb, var(--c-accent) 45%, transparent) 0,
    transparent 46%
  );
  clip-path: polygon(100% 100%, 100% 0, 0 100%);
}

.platform-icon {
  grid-row: 1 / span 2;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 52px;
  color: var(--c-accent);
  background: linear-gradient(160deg, #232a3a, #141a26);
  border: 1px solid color-mix(in srgb, var(--c-accent) 45%, transparent);
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
}

.platform-icon svg {
  width: 22px;
  height: 22px;
}

.platform-meta {
  display: flex;
  align-items: baseline;
  gap: 5px;
  min-width: 0;
  overflow: hidden;
}

.platform-label {
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 1px;
  white-space: nowrap;
  color: var(--c-text);
}

.platform-sub {
  font-size: 10px;
  letter-spacing: 2px;
  white-space: nowrap;
  color: var(--c-text-muted);
}

.price-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 3px 7px;
  min-width: 0;
}

.price {
  white-space: nowrap;
  font-family: var(--font-price);
  font-size: 15px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--c-accent);
  text-shadow: 0 0 16px rgba(255, 176, 32, 0.35);
}

.price b {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0.2px;
}

.discount {
  flex-shrink: 0;
  transform: translateY(-2px);
  padding: 3px 9px;
  font-size: 12px;
  font-weight: 800;
  color: var(--c-bg);
  background: linear-gradient(120deg, #ffd47a, var(--c-accent));
  clip-path: polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%);
}

.origin {
  white-space: nowrap;
  font-family: var(--font-price);
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  color: var(--c-text-muted);
  text-decoration: line-through;
}

.platform-price {
  --font-price: 'PingFang SC', 'HarmonyOS Sans SC', 'Helvetica Neue', 'Segoe UI', 'Microsoft YaHei', sans-serif;
}

@media (max-width: 413px) {
  .platform-price {
    column-gap: 8px;
    padding: 12px 10px;
  }

  .platform-icon {
    width: 34px;
    height: 38px;
  }

  .platform-icon svg {
    width: 16px;
    height: 16px;
  }

  .platform-label {
    font-size: 14px;
  }

  .price {
    font-size: 13px;
  }

  .price b {
    font-size: 20px;
  }

  .price-row {
    gap: 2px 5px;
  }

  .discount {
    padding: 2px 7px;
    font-size: 10px;
  }

  .origin {
    font-size: 11px;
  }
}

@media (max-width: 359px) {
  .platform-icon {
    display: none;
  }
}
</style>
