<script setup lang="ts">
/**
 * 分类分组卡：分组标题（金色斜切标记）+ 荧光绿小方块封面网格（综合页签用）。
 */
import type { CategoryGroup } from '@/config/category.mock';
import { useToast } from '@/composables/use-toast';

defineProps<{ group: CategoryGroup }>();

const toast = useToast();
</script>

<template>
  <section class="group card">
    <h2 class="sec-title">
      {{ group.title }}
    </h2>
    <div
      v-if="group.items.length"
      class="grid"
    >
      <button
        v-for="item in group.items"
        :key="item.id"
        class="item"
        @click="toast.show(`「${item.name}」详情即将上线`)"
      >
        <div class="thumb">
          <span class="thumb-text">{{ item.cover }}</span>
        </div>
        <span class="name">{{ item.name }}</span>
      </button>
    </div>
    <p
      v-else
      class="group-empty"
    >
      该分类暂无上架商品
    </p>
  </section>
</template>

<style scoped>
.group {
  padding: 14px;
}

.grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px 10px;
}

.group-empty {
  margin-top: 12px;
  font-size: 12px;
  color: var(--c-text-muted);
}

.item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.thumb {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  padding: 4px;
  background: var(--c-cover-bg);
  border: 1px solid rgba(61, 255, 155, 0.45);
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
  transition: border-color 0.2s ease;
}

.item:hover .thumb {
  border-color: var(--c-neon);
}

.thumb-text {
  font-size: 10px;
  font-weight: 700;
  color: var(--c-neon);
  text-align: center;
  line-height: 1.3;
}

.name {
  max-width: 100%;
  font-size: 12px;
  color: var(--c-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(6, 1fr);
  }
}
</style>
