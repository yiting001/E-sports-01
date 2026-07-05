<script setup lang="ts">
/**
 * 我的页 · 会员等级卡（购物身份展示）。
 * 展示当前会员等级、下单折扣与累计消费，以及晋升下一等级还需消费的金额。
 */
import { computed, onMounted, ref } from 'vue';
import { FEE_RATE_BASE, fenToYuan, type MemberMineView } from '@app/contracts';
import { memberApi } from '@/api/member.api';

const mine = ref<MemberMineView | null>(null);

const discountText = computed(() => {
  const bp = mine.value?.discountBp ?? FEE_RATE_BASE;
  if (bp >= FEE_RATE_BASE) {
    return '暂无折扣';
  }
  return `${(bp / (FEE_RATE_BASE / 10)).toFixed(1)} 折`;
});

onMounted(async () => {
  mine.value = await memberApi.mine();
});
</script>

<template>
  <section
    v-if="mine"
    class="card member-card"
  >
    <div class="head">
      <span class="level">Lv.{{ mine.level }} {{ mine.levelName }}</span>
      <span class="discount">{{ discountText }}</span>
    </div>
    <div class="meta">
      <span>累计消费 ¥{{ mine.spendYuan }}</span>
      <span v-if="mine.nextLevelName">
        再消费 ¥{{ fenToYuan(mine.nextNeedFen) }} 升级 {{ mine.nextLevelName }}
      </span>
      <span v-else>已是最高等级</span>
    </div>
  </section>
</template>

<style scoped>
.member-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
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
