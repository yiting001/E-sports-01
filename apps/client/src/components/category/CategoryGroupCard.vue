<script setup lang="ts">
/**
 * 分类分组卡：分组标题（金色斜切标记）+ 商品入口小卡网格（综合页签用）。
 * 商品入口点击进入商品详情；无商品时显示紧凑空态，不撑满大屏。
 */
import type { CategoryGroup } from '@/config/category.mock';
import { useRouter } from 'vue-router';

defineProps<{ group: CategoryGroup }>();

const router = useRouter();
</script>

<template>
  <section class="group card">
    <h2 class="sec-title">
      <img
        v-if="group.icon"
        :src="group.icon"
        :alt="group.title"
        class="cat-icon"
      >
      <span
        v-else-if="group.iconText"
        class="cat-icon-text"
      >{{ group.iconText }}</span>
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
        @click="router.push(`/products/${item.id}`)"
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
  min-height: 132px;
  padding: 14px;
}

.grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.group-empty {
  min-height: 54px;
  display: flex;
  align-items: center;
  margin-top: 10px;
  font-size: 12px;
  color: var(--c-text-muted);
}

.cat-icon {
  width: 22px;
  height: 22px;
  border-radius: 5px;
  object-fit: cover;
}

.cat-icon-text {
  padding: 1px 6px;
  font-size: 11px;
  font-style: normal;
  font-weight: 700;
  letter-spacing: 0;
  color: var(--c-neon);
  border: 1px solid rgba(61, 255, 155, 0.45);
  border-radius: 4px;
}

.item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 92px;
  padding: 10px 8px;
  border: 1px solid rgba(150, 165, 195, 0.14);
  background: rgba(11, 14, 20, 0.24);
  transition: border-color 0.2s ease, background 0.2s ease;
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}

.item:hover {
  border-color: rgba(61, 255, 155, 0.45);
  background: rgba(61, 255, 155, 0.06);
}

.thumb {
  width: 50px;
  height: 50px;
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
    grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
  }
}
</style>
