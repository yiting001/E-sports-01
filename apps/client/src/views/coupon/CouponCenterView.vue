<script setup lang="ts">
/**
 * 领券中心页（全屏）：展示上架且在有效期内的优惠券，点击领取。
 * 领完/已达单人限领的券置灰不可再领。
 */
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { CouponPublicView } from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import { couponApi } from '@/api/coupon.api';
import { useToast } from '@/composables/use-toast';
import {
  couponDateText,
  couponFaceText,
  couponThresholdText,
} from './coupon-format';

const router = useRouter();
const toast = useToast();
const list = ref<CouponPublicView[]>([]);
const loading = ref(true);
const claimingId = ref('');

/** 是否还能领：有剩余且未达单人限领 */
function claimable(item: CouponPublicView): boolean {
  return item.remaining > 0 && item.claimedByMe < item.perUserLimit;
}

function claimText(item: CouponPublicView): string {
  if (item.remaining <= 0) {
    return '已领完';
  }
  if (item.claimedByMe >= item.perUserLimit) {
    return '已领取';
  }
  return '领取';
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    list.value = await couponApi.center();
  } finally {
    loading.value = false;
  }
}

async function claim(item: CouponPublicView): Promise<void> {
  if (!claimable(item) || claimingId.value) {
    return;
  }
  claimingId.value = item.id;
  try {
    await couponApi.claim(item.id);
    toast.show('领取成功');
    await load();
  } finally {
    claimingId.value = '';
  }
}

onMounted(load);
</script>

<template>
  <div class="coupon-center">
    <header class="bar">
      <button
        class="back"
        aria-label="返回"
        @click="router.back()"
      >
        <AppIcon
          name="chevron"
          :size="20"
        />
      </button>
      <div class="bar-title">
        <span class="name">领券中心</span>
        <span class="tip">领取优惠券，下单立享抵扣</span>
      </div>
    </header>

    <div class="scroll">
      <p
        v-if="loading"
        class="hint"
      >
        加载中…
      </p>
      <p
        v-else-if="!list.length"
        class="hint"
      >
        暂无可领取的优惠券
      </p>
      <div
        v-for="item in list"
        v-else
        :key="item.id"
        class="coupon card"
        :class="{ disabled: !claimable(item) }"
      >
        <div class="face">
          <span class="value">{{ couponFaceText(item.type, item.value) }}</span>
          <span class="threshold">{{ couponThresholdText(item.thresholdFen) }}</span>
        </div>
        <div class="mid">
          <span class="title">{{ item.title }}</span>
          <span class="time">
            {{ couponDateText(item.validFrom) }} ~ {{ couponDateText(item.validTo) }}
          </span>
          <span class="left">剩余 {{ item.remaining }} 张</span>
        </div>
        <button
          class="claim"
          :disabled="!claimable(item) || claimingId === item.id"
          @click="claim(item)"
        >
          {{ claimingId === item.id ? '领取中…' : claimText(item) }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coupon-center {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(70% 36% at 50% 0%, rgba(255, 176, 32, 0.07), transparent 70%),
    var(--c-bg);
}

.bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-surface);
}

.back {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  color: var(--c-text);
  transform: rotate(180deg);
}

.bar-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.name {
  font-size: 16px;
  font-weight: 800;
  font-style: italic;
}

.tip {
  font-size: 12px;
  color: var(--c-accent);
}

.scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hint {
  text-align: center;
  font-size: 13px;
  color: var(--c-text-secondary);
  padding: 24px 0;
}

.coupon {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
}

.coupon.disabled {
  opacity: 0.5;
}

.face {
  flex-shrink: 0;
  width: 88px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding-right: 14px;
  border-right: 1px dashed var(--c-border);
}

.value {
  font-size: 20px;
  font-weight: 800;
  color: var(--c-accent);
}

.threshold {
  font-size: 11px;
  color: var(--c-text-secondary);
}

.mid {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title {
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time,
.left {
  font-size: 12px;
  color: var(--c-text-secondary);
}

.claim {
  flex-shrink: 0;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 700;
  color: #1a1206;
  background: var(--c-accent);
  clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
}

.claim:disabled {
  background: var(--c-border);
  color: var(--c-text-secondary);
}
</style>
