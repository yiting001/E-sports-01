<script setup lang="ts">
/**
 * 我的优惠券页（全屏）：按状态分组展示已领取的券（可用/已使用/已过期）。
 * 券面信息为领取时的快照，后续改券不影响。
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { UserCouponStatus, type UserCouponView } from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import { couponApi } from '@/api/coupon.api';
import {
  couponDateText,
  couponFaceText,
  couponThresholdText,
} from './coupon-format';

const router = useRouter();
const list = ref<UserCouponView[]>([]);
const loading = ref(true);

/** 可用（未使用且未过期）优先展示 */
const usable = computed(() =>
  list.value.filter(
    (item) => item.status === UserCouponStatus.Unused && !item.expired,
  ),
);

/** 已使用/已过期归入历史 */
const history = computed(() =>
  list.value.filter(
    (item) => item.status !== UserCouponStatus.Unused || item.expired,
  ),
);

function statusText(item: UserCouponView): string {
  if (item.status === UserCouponStatus.Used) {
    return '已使用';
  }
  return item.expired ? '已过期' : '可使用';
}

onMounted(async () => {
  try {
    list.value = await couponApi.mine();
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="my-coupons client-page">
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
        <span class="name">我的优惠券</span>
        <span class="tip">下单结算时可选券抵扣</span>
      </div>
      <button
        class="go-center"
        @click="router.push({ name: 'coupon-center' })"
      >
        领券中心
      </button>
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
        暂无优惠券，去领券中心逛逛吧
      </p>
      <template v-else>
        <div
          v-for="item in [...usable, ...history]"
          :key="item.id"
          class="coupon card"
          :class="{ disabled: statusText(item) !== '可使用' }"
        >
          <div class="face">
            <span class="value">{{ couponFaceText(item.type, item.value) }}</span>
            <span class="threshold">{{ couponThresholdText(item.thresholdFen) }}</span>
          </div>
          <div class="mid">
            <span class="title">{{ item.title }}</span>
            <span class="time">{{ couponDateText(item.expiresAt) }} 到期</span>
          </div>
          <span
            class="status"
            :class="{ ok: statusText(item) === '可使用' }"
          >
            {{ statusText(item) }}
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.my-coupons {
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
  flex: 1;
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

.go-center {
  flex-shrink: 0;
  font-size: 13px;
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

.time {
  font-size: 12px;
  color: var(--c-text-secondary);
}

.status {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--c-text-secondary);
}

.status.ok {
  color: var(--c-accent);
}
</style>
