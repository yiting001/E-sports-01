<script setup lang="ts">
/**
 * 排行榜条目卡：名次编号 + 商品标题 + 销量/热度进度 + 快捷操作。
 */
import type { RankItem } from '@/config/category.mock';
import { useRouter } from 'vue-router';

defineProps<{
  item: RankItem;
  /** 名次（从 0 开始，展示时 +1 补零） */
  index: number;
}>();

const router = useRouter();

/** 前三名使用金色高亮 */
const TOP_COUNT = 3;

/** 名次补零：1 → 01，竞赛计分板惯例 */
function rankNo(index: number): string {
  return String(index + 1).padStart(2, '0');
}
</script>

<template>
  <article
    class="rank card"
    :class="{ 'rank--top': index < TOP_COUNT }"
  >
    <span
      class="no"
      :class="{ top: index < TOP_COUNT }"
    >
      {{ rankNo(index) }}
    </span>
    <div class="main">
      <div class="title-row">
        <h3 class="title">
          {{ item.title }}
        </h3>
        <span class="heat">
          {{ item.heat > 0 ? `热度 ${item.heat}` : '新上榜' }}
        </span>
      </div>
      <div class="stats">
        <span class="sold">已售 {{ item.sold }}</span>
        <div class="bar">
          <div
            class="fill"
            :style="{ width: `${item.heat}%` }"
          />
        </div>
      </div>
    </div>
    <div class="actions">
      <button
        class="btn ghost"
        @click="router.push(`/products/${item.id}`)"
      >
        查看详情
      </button>
      <button
        class="btn primary"
        @click="router.push(`/checkout/${item.id}`)"
      >
        立即下单
      </button>
    </div>
  </article>
</template>

<style scoped>
.rank {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  min-height: 92px;
  padding: 16px 18px;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.rank:hover {
  border-color: rgba(61, 255, 155, 0.42);
  transform: translateY(-1px);
}

.rank--top {
  border-color: rgba(255, 176, 32, 0.28);
}

.no {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  font-family: var(--font-num);
  font-size: 24px;
  font-weight: 800;
  font-style: italic;
  color: var(--c-text-muted);
  background: rgba(150, 165, 195, 0.08);
  border: 1px solid var(--c-border);
  clip-path: polygon(9px 0, 100% 0, 100% calc(100% - 9px), calc(100% - 9px) 100%, 0 100%, 0 9px);
}

.no.top {
  color: var(--c-accent);
  background: var(--c-accent-dim);
  border-color: rgba(255, 176, 32, 0.45);
  text-shadow: 0 0 12px rgba(255, 176, 32, 0.4);
}

.main {
  min-width: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.title {
  font-size: 15px;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.heat {
  flex-shrink: 0;
  padding: 2px 8px;
  font-family: var(--font-num);
  font-size: 11px;
  color: var(--c-neon);
  border: 1px solid rgba(61, 255, 155, 0.28);
  border-radius: 999px;
}

.stats {
  margin-top: 10px;
  display: grid;
  grid-template-columns: auto minmax(120px, 1fr);
  align-items: center;
  gap: 10px;
}

.bar {
  height: 6px;
  background: rgba(150, 165, 195, 0.14);
  transform: skewX(-18deg);
  overflow: hidden;
}

.fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(255, 176, 32, 0.5), var(--c-accent));
}

.sold {
  font-size: 12px;
  color: var(--c-text-secondary);
  white-space: nowrap;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn {
  min-width: 82px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 800;
  clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
}

.btn.primary {
  background: var(--c-accent);
  color: var(--c-bg);
  font-weight: 700;
}

.btn.ghost {
  background: transparent;
  border: 1px solid var(--c-border);
  color: var(--c-text-secondary);
}

@media (max-width: 767px) {
  .rank {
    grid-template-columns: 48px minmax(0, 1fr);
    align-items: start;
    gap: 12px;
    padding: 14px;
  }

  .no {
    width: 44px;
    height: 44px;
    font-size: 22px;
  }

  .title-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .stats {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .actions {
    grid-column: 1 / -1;
    width: 100%;
    flex-direction: row;
  }

  .btn {
    flex: 1;
    text-align: center;
  }
}
</style>
