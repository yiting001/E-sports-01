<script setup lang="ts">
/**
 * 会员等级页（全屏）：我的当前等级/折扣/累计消费 + 全部档位晋升规则。
 * 档位由管理端配置（配置中心），按累计消费自动定级。
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  FEE_RATE_BASE,
  fenToYuan,
  type MemberLevelTier,
  type MemberMineView,
} from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import { memberApi } from '@/api/member.api';

const router = useRouter();
const mine = ref<MemberMineView | null>(null);
const tiers = ref<MemberLevelTier[]>([]);
const loading = ref(true);

const discountText = computed(() => {
  const bp = mine.value?.discountBp ?? FEE_RATE_BASE;
  if (bp >= FEE_RATE_BASE) {
    return '暂无折扣';
  }
  return `${(bp / (FEE_RATE_BASE / 10)).toFixed(1)} 折`;
});

/** 档位折扣文案 */
function tierDiscountText(tier: MemberLevelTier): string {
  if (tier.discountBp >= FEE_RATE_BASE) {
    return '无折扣';
  }
  return `${(tier.discountBp / (FEE_RATE_BASE / 10)).toFixed(1)} 折`;
}

onMounted(async () => {
  try {
    [mine.value, tiers.value] = await Promise.all([
      memberApi.mine(),
      memberApi.levels(),
    ]);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="member-levels client-page">
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
        <span class="name">会员等级</span>
        <span class="tip">消费越多等级越高，下单折扣越优</span>
      </div>
    </header>

    <div class="scroll">
      <p
        v-if="loading"
        class="hint"
      >
        加载中…
      </p>
      <template v-else>
        <section
          v-if="mine"
          class="card mine"
        >
          <div class="mine-head">
            <span class="mine-level">Lv.{{ mine.level }} {{ mine.levelName }}</span>
            <span class="mine-discount">{{ discountText }}</span>
          </div>
          <div class="mine-meta">
            <span>累计消费 ¥{{ mine.spendYuan }}</span>
            <span v-if="mine.nextLevelName">
              再消费 ¥{{ fenToYuan(mine.nextNeedFen) }} 升级 {{ mine.nextLevelName }}
            </span>
            <span v-else>已是最高等级</span>
          </div>
        </section>

        <section class="card tiers">
          <h2 class="sec-title">
            等级规则
          </h2>
          <div
            v-for="tier in tiers"
            :key="tier.level"
            class="tier"
            :class="{ current: mine && tier.level === mine.level }"
          >
            <span class="tier-name">Lv.{{ tier.level }} {{ tier.name }}</span>
            <span class="tier-need">累计消费满 ¥{{ fenToYuan(tier.minSpendFen) }}</span>
            <span class="tier-discount">{{ tierDiscountText(tier) }}</span>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.member-levels {
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

.mine {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
}

.mine-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mine-level {
  font-size: 16px;
  font-weight: 800;
  color: var(--c-accent);
}

.mine-discount {
  font-size: 13px;
  font-weight: 700;
}

.mine-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--c-text-secondary);
}

.tiers {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sec-title {
  font-size: 14px;
  font-weight: 800;
}

.tier {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--c-border);
}

.tier.current {
  border-color: var(--c-accent);
  background: var(--c-accent-dim);
}

.tier-name {
  flex: 1;
  font-size: 13px;
  font-weight: 700;
}

.tier-need {
  font-size: 12px;
  color: var(--c-text-secondary);
}

.tier-discount {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--c-accent);
}
</style>
