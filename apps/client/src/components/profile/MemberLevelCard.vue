<script setup lang="ts">
/**
 * 我的页 · 会员等级卡（购物身份展示）。
 * 展示当前会员等级、下单折扣与累计消费，以及晋升下一等级还需消费的金额。
 */
import { computed } from 'vue';
import { FEE_RATE_BASE, fenToYuan } from '@app/contracts';
import { useMemberStore } from '@/stores/member.store';

const member = useMemberStore();

const discountText = computed(() => {
  const bp = member.mine?.discountBp ?? FEE_RATE_BASE;
  if (bp >= FEE_RATE_BASE) {
    return '暂无折扣';
  }
  return `${(bp / (FEE_RATE_BASE / 10)).toFixed(1)} 折`;
});
</script>

<template>
  <section class="card member-card">
    <p
      v-if="member.loading"
      class="state"
    >
      会员等级加载中…
    </p>
    <div
      v-else-if="member.loadError"
      class="state state--error"
    >
      <span>会员等级加载失败</span>
      <button
        type="button"
        class="retry"
        :disabled="member.loading"
        @click="member.refresh"
      >
        重试
      </button>
    </div>
    <template v-else-if="member.mine">
      <div class="head">
        <span class="level">Lv.{{ member.mine.level }} {{ member.mine.levelName }}</span>
        <span class="discount">{{ discountText }}</span>
      </div>
      <div class="meta">
        <span>累计消费 ¥{{ member.mine.spendYuan }}</span>
        <span v-if="member.mine.nextLevelName">
          再消费 ¥{{ fenToYuan(member.mine.nextNeedFen) }} 升级 {{ member.mine.nextLevelName }}
        </span>
        <span v-else>已是最高等级</span>
      </div>
    </template>
  </section>
</template>

<style scoped>
.member-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
}

.state {
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-text-secondary);
  font-size: 13px;
}

.state--error {
  justify-content: space-between;
  color: var(--c-danger);
}

.retry {
  min-width: 64px;
  min-height: 32px;
  padding: 6px 12px;
  border: 1px solid var(--c-border);
  color: var(--c-accent);
  font-size: 12px;
  font-weight: 700;
}

.retry:disabled {
  opacity: 0.6;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.level {
  font-size: 15px;
  font-weight: 800;
  font-style: italic;
  color: var(--c-accent);
}

.discount {
  font-size: 13px;
  color: var(--c-text-secondary);
}

.meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--c-text-muted);
}
</style>
