<script setup lang="ts">
/**
 * 推广发券页（全屏）：分发人查看自己可发放的定向券。
 * 展示券面、发放进度（经我领取张数/剩余库存），一键复制专属领取链接分享引流。
 */
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { CouponShareView } from '@app/contracts';
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
const list = ref<CouponShareView[]>([]);
const loading = ref(true);

/** 分发链接：当前站点域名 + 分发码落地页路由 */
function shareLink(item: CouponShareView): string {
  const route = router.resolve({
    name: 'coupon-claim',
    params: { code: item.code },
  });
  return `${window.location.origin}${route.href}`;
}

async function copyLink(item: CouponShareView): Promise<void> {
  await navigator.clipboard.writeText(shareLink(item));
  toast.show('专属链接已复制，快去分享吧');
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    list.value = await couponApi.shareMine();
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="coupon-share client-page">
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
        <span class="name">推广发券</span>
        <span class="tip">复制专属链接分享，用户领券归因到你</span>
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
        暂无可发放的优惠券，请联系运营为你指派
      </p>
      <div
        v-for="item in list"
        v-else
        :key="item.code"
        class="coupon card"
        :class="{ disabled: !item.enabled }"
      >
        <div class="row">
          <div class="face">
            <span class="value">{{ couponFaceText(item.type, item.value) }}</span>
            <span class="threshold">{{ couponThresholdText(item.thresholdFen) }}</span>
          </div>
          <div class="mid">
            <span class="title">{{ item.title }}</span>
            <span class="time">
              {{ couponDateText(item.validFrom) }} ~ {{ couponDateText(item.validTo) }}
            </span>
            <span class="left">经我领取 {{ item.claimedCount }} 张 · 剩余 {{ item.remaining }} 张</span>
          </div>
          <button
            class="copy"
            :disabled="!item.enabled"
            @click="copyLink(item)"
          >
            {{ item.enabled ? '复制链接' : '已下架' }}
          </button>
        </div>
        <div class="link">
          {{ shareLink(item) }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coupon-share {
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
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
}

.coupon.disabled {
  opacity: 0.5;
}

.row {
  display: flex;
  align-items: center;
  gap: 14px;
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

.copy {
  flex-shrink: 0;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 700;
  color: #1a1206;
  background: var(--c-accent);
  clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
}

.copy:disabled {
  background: var(--c-border);
  color: var(--c-text-secondary);
}

.link {
  padding: 8px 10px;
  font-size: 11px;
  color: var(--c-text-secondary);
  word-break: break-all;
  background: var(--c-bg);
  border: 1px dashed var(--c-border);
}
</style>
