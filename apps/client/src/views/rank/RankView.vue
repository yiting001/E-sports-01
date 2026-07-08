<script setup lang="ts">
/**
 * 排行榜页（全屏）：打手榜（完成单数）与消费榜（累计消费）两个 Tab。
 * 数据由后端只读聚合，昵称脱敏展示；后台关闭排行榜时直接返回个人中心。
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { fenToYuan, type RankBoardView, type RankEntryView } from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import { rankApi } from '@/api/rank.api';
import { usePortalStore } from '@/stores/portal.store';

/** Tab 定义：key → 标题 */
const TABS = [
  { key: 'boosters', label: '打手榜' },
  { key: 'spenders', label: '消费榜' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const router = useRouter();
const board = ref<RankBoardView | null>(null);
const loading = ref(true);
const tab = ref<TabKey>('boosters');

const entries = computed<RankEntryView[]>(() =>
  board.value ? board.value[tab.value] : [],
);

/** 榜单数值文案：打手榜为单数，消费榜为金额 */
function valueText(entry: RankEntryView): string {
  if (tab.value === 'boosters') {
    return `${entry.value} 单`;
  }
  return `¥${fenToYuan(entry.value)}`;
}

onMounted(async () => {
  const portal = usePortalStore();
  if (!portal.loaded) {
    await portal.load();
  }
  if (!portal.showRank) {
    void router.replace({ name: 'profile' });
    return;
  }
  try {
    board.value = await rankApi.board();
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="rank-page client-page">
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
        <span class="name">排行榜</span>
        <span class="tip">打手完成单数 · 玩家累计消费</span>
      </div>
    </header>

    <div class="tabs">
      <button
        v-for="item in TABS"
        :key="item.key"
        class="tab"
        :class="{ active: tab === item.key }"
        @click="tab = item.key"
      >
        {{ item.label }}
      </button>
    </div>

    <div class="scroll">
      <p
        v-if="loading"
        class="hint"
      >
        加载中…
      </p>
      <p
        v-else-if="!entries.length"
        class="hint"
      >
        暂无上榜数据
      </p>
      <div
        v-for="entry in entries"
        v-else
        :key="entry.rank"
        class="row card"
      >
        <span
          class="rank-no"
          :class="{ top: entry.rank <= 3 }"
        >
          {{ entry.rank }}
        </span>
        <span class="rank-name">{{ entry.name }}</span>
        <span class="rank-value">{{ valueText(entry) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rank-page {
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

.tabs {
  flex-shrink: 0;
  display: flex;
  gap: 10px;
  padding: 12px 16px 0;
}

.tab {
  flex: 1;
  padding: 10px 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--c-text-secondary);
  background: var(--c-surface);
  border: 1px solid var(--c-border);
}

.tab.active {
  color: var(--c-accent);
  border-color: var(--c-accent);
  background: var(--c-accent-dim);
}

.scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hint {
  text-align: center;
  font-size: 13px;
  color: var(--c-text-secondary);
  padding: 24px 0;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}

.rank-no {
  flex-shrink: 0;
  width: 28px;
  text-align: center;
  font-size: 15px;
  font-weight: 800;
  color: var(--c-text-secondary);
}

.rank-no.top {
  color: var(--c-accent);
}

.rank-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-value {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 800;
  color: var(--c-accent);
}
</style>
