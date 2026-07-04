<script setup lang="ts">
/**
 * 排行榜条目卡：名次编号（竞赛计分板字体，前三名金色）+ 标题 + 热度进度条 + 操作按钮。
 */
import type { RankItem } from '@/config/category.mock';
import { useToast } from '@/composables/use-toast';

defineProps<{
  item: RankItem;
  /** 名次（从 0 开始，展示时 +1 补零） */
  index: number;
}>();

const toast = useToast();

/** 前三名使用金色高亮 */
const TOP_COUNT = 3;

/** 名次补零：1 → 01，竞赛计分板惯例 */
function rankNo(index: number): string {
  return String(index + 1).padStart(2, '0');
}
</script>

<template>
  <div class="rank card">
    <span
      class="no"
      :class="{ top: index < TOP_COUNT }"
    >
      {{ rankNo(index) }}
    </span>
    <div class="body">
      <h3 class="title">
        {{ item.title }}
      </h3>
      <div class="stats">
        <div class="bar">
          <div
            class="fill"
            :style="{ width: `${item.heat}%` }"
          />
        </div>
        <span class="sold">已售 {{ item.sold }}</span>
      </div>
    </div>
    <div class="actions">
      <button
        class="btn primary"
        @click="toast.show(`「${item.title}」下单流程即将上线`)"
      >
        立即点单
      </button>
      <button
        class="btn ghost"
        @click="toast.show('评价列表即将上线')"
      >
        查看评价
      </button>
    </div>
  </div>
</template>

<style scoped>
.rank {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
}

.no {
  flex-shrink: 0;
  width: 40px;
  font-family: var(--font-num);
  font-size: 26px;
  font-weight: 800;
  font-style: italic;
  color: var(--c-text-muted);
}

.no.top {
  color: var(--c-accent);
  text-shadow: 0 0 12px rgba(255, 176, 32, 0.4);
}

.body {
  flex: 1;
  min-width: 0;
}

.title {
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stats {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar {
  flex: 1;
  max-width: 160px;
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
}

.actions {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn {
  padding: 7px 14px;
  font-size: 12px;
  font-weight: 600;
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
</style>
