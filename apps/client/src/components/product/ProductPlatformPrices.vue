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
        <span
          v-if="product.originPriceFen > product.priceFen"
          class="origin"
        >¥{{ fenToYuan(product.originPriceFen) }}</span>
      </span>
      <span class="price-row">
        <span class="price">
          ¥<b>{{ fenToYuan(product.priceFen) }}</b>
        </span>
      </span>
      <span
        v-if="discountLabel(product.priceFen, product.originPriceFen)"
        class="discount"
      >{{ discountLabel(product.priceFen, product.originPriceFen) }}</span>
    </div>
    <div class="platform-price">
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
        <span
          v-if="product.pcOriginPriceFen > product.pcPriceFen"
          class="origin"
        >¥{{ fenToYuan(product.pcOriginPriceFen) }}</span>
      </span>
      <span class="price-row">
        <span class="price">
          ¥<b>{{ fenToYuan(product.pcPriceFen) }}</b>
        </span>
      </span>
      <span
        v-if="discountLabel(product.pcPriceFen, product.pcOriginPriceFen)"
        class="discount"
      >{{ discountLabel(product.pcPriceFen, product.pcOriginPriceFen) }}</span>
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

/*
 * 卡片固定为「图标 + 两行文字」：第一行平台名 + 划线原价，第二行现价，
 * 折扣角标内置在卡片右上角（不超出边框）；所有文字不换行，有/无折扣时卡片高度一致。
 */
.platform-price {
  --icon-size: 48px;
  --pad-x: 13px;

  position: relative;
  overflow: hidden;
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: auto auto;
  align-items: center;
  column-gap: 12px;
  row-gap: 5px;
  padding: 14px var(--pad-x);
  border: 1px solid color-mix(in srgb, var(--c-accent) 30%, var(--c-border));
  border-radius: 16px;
  background:
    radial-gradient(120% 90% at 20% 0%, rgba(255, 176, 32, 0.12), transparent 55%),
    linear-gradient(160deg, #1c2230, #10141d 70%);
  box-shadow: inset 0 1px 0 rgba(255, 224, 160, 0.08);
}

.platform-icon {
  grid-row: 1 / span 2;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: var(--icon-size);
  height: var(--icon-size);
  color: var(--c-accent);
  background: radial-gradient(120% 120% at 30% 25%, #2a3244, #141a26 75%);
  border: 1px solid color-mix(in srgb, var(--c-accent) 45%, transparent);
  border-radius: 50%;
  box-shadow: inset 0 1px 2px rgba(255, 224, 160, 0.12);
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

.price-row {
  display: flex;
  align-items: baseline;
  gap: 7px;
  min-width: 0;
  overflow: hidden;
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
  position: absolute;
  z-index: 1;
  top: 0;
  right: 0;
  padding: 2px 9px 2px 8px;
  font-size: 11px;
  line-height: 14px;
  font-weight: 800;
  white-space: nowrap;
  color: var(--c-bg);
  background: linear-gradient(120deg, #ffd47a, var(--c-accent));
  border-radius: 0 15px 0 10px;
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

@media (max-width: 479px) {
  .platform-price {
    --icon-size: 38px;
    --pad-x: 8px;

    column-gap: 5px;
    padding: 12px var(--pad-x);
  }

  .platform-meta {
    gap: 4px;
  }

  .platform-icon svg {
    width: 16px;
    height: 16px;
  }

  .platform-label {
    font-size: 14px;
    letter-spacing: 0;
  }

  .price {
    font-size: 13px;
  }

  .price b {
    font-size: 20px;
  }

  .discount {
    padding: 1px 7px 1px 6px;
    font-size: 10px;
  }

  .origin {
    font-size: 10px;
  }
}

@media (max-width: 374px) {
  .origin {
    font-size: 9px;
  }
}

@media (max-width: 359px) {
  .platform-price {
    grid-template-columns: minmax(0, 1fr);
    column-gap: 0;
  }

  .platform-icon {
    display: none;
  }
}
</style>
