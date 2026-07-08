<script setup lang="ts">
/**
 * 分发链接落地页（全屏）：按分发码查看定向券并领取。
 * 领取归因到对应分发人；领完/已达限领置灰，领取成功可跳我的优惠券。
 */
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { CouponCodeView } from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import { couponApi } from '@/api/coupon.api';
import { useToast } from '@/composables/use-toast';
import {
  couponDateText,
  couponFaceText,
  couponThresholdText,
} from './coupon-format';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const code = computed(() => String(route.params.code ?? ''));
const coupon = ref<CouponCodeView | null>(null);
const loading = ref(true);
const claiming = ref(false);
const claimed = ref(false);
const error = ref('');

/** 是否还能领：有剩余且未达单人限领 */
const claimable = computed(() => {
  const item = coupon.value;
  return Boolean(
    item && item.remaining > 0 && item.claimedByMe < item.perUserLimit,
  );
});

const claimText = computed(() => {
  const item = coupon.value;
  if (!item) {
    return '';
  }
  if (claimed.value) {
    return '已领取';
  }
  if (item.remaining <= 0) {
    return '已领完';
  }
  if (item.claimedByMe >= item.perUserLimit) {
    return '已领取';
  }
  return '立即领取';
});

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    coupon.value = await couponApi.byCode(code.value);
  } catch {
    error.value = '链接无效或优惠券已下架';
  } finally {
    loading.value = false;
  }
}

async function claim(): Promise<void> {
  if (!claimable.value || claiming.value || claimed.value) {
    return;
  }
  claiming.value = true;
  try {
    await couponApi.claimByCode(code.value);
    claimed.value = true;
    toast.show('领取成功');
  } finally {
    claiming.value = false;
  }
}

function goMine(): void {
  void router.push({ name: 'my-coupons' });
}

onMounted(load);
</script>

<template>
  <div class="coupon-claim client-page">
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
        <span class="name">领取优惠券</span>
        <span class="tip">专属福利，领取后下单立享抵扣</span>
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
        v-else-if="error"
        class="hint"
      >
        {{ error }}
      </p>
      <template v-else-if="coupon">
        <div class="coupon card">
          <div class="face">
            <span class="value">{{ couponFaceText(coupon.type, coupon.value) }}</span>
            <span class="threshold">{{ couponThresholdText(coupon.thresholdFen) }}</span>
          </div>
          <div class="mid">
            <span class="title">{{ coupon.title }}</span>
            <span class="time">
              {{ couponDateText(coupon.validFrom) }} ~ {{ couponDateText(coupon.validTo) }}
            </span>
            <span class="left">剩余 {{ coupon.remaining }} 张</span>
          </div>
        </div>

        <button
          class="claim-btn"
          :disabled="!claimable || claiming || claimed"
          @click="claim"
        >
          {{ claiming ? '领取中…' : claimText }}
        </button>
        <button
          v-if="claimed"
          class="mine-btn"
          @click="goMine"
        >
          去我的优惠券查看
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.coupon-claim {
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
  gap: 14px;
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

.claim-btn {
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 700;
  color: #1a1206;
  background: var(--c-accent);
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}

.claim-btn:disabled {
  background: var(--c-border);
  color: var(--c-text-secondary);
}

.mine-btn {
  padding: 10px 16px;
  font-size: 13px;
  color: var(--c-accent);
  border: 1px solid var(--c-accent);
}
</style>
