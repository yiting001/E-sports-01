<script setup lang="ts">
/**
 * 综合分类卡：后台分类名作为大标题，下面展示该分类的真实商品封面与关键明细。
 * 商品入口点击进入详情；图片失败回退封面标语，无商品时保持紧凑空态。
 */
import { ref } from 'vue';
import { fenToYuan } from '@app/contracts';
import type { CategoryGroup } from '@/config/category.mock';
import ProductCoverThumb from '@/components/product/ProductCoverThumb.vue';
import { resolveMediaUrl } from '@/utils/media-url';
import { useRouter } from 'vue-router';

defineProps<{ group: CategoryGroup }>();

const router = useRouter();
const iconFailed = ref(false);
</script>

<template>
  <section class="group card">
    <header class="group-head">
      <h2 class="sec-title">
        <img
          v-if="group.icon && !iconFailed"
          :src="resolveMediaUrl(group.icon)"
          alt=""
          class="cat-icon"
          @error="iconFailed = true"
        >
        <span
          v-else
          class="cat-icon-text"
        >{{ group.iconText || group.title.slice(0, 2) }}</span>
        <span class="group-title">{{ group.title }}</span>
      </h2>
      <span class="item-count">{{ group.items.length }} 项</span>
    </header>
    <div
      v-if="group.items.length"
      class="grid"
    >
      <button
        v-for="item in group.items"
        :key="item.id"
        type="button"
        class="item"
        @click="router.push(`/products/${item.id}`)"
      >
        <ProductCoverThumb
          :src="item.cover"
          :fallback="item.coverTitle || group.iconText || '商品'"
        />
        <div class="item-info">
          <strong class="name">{{ item.title }}</strong>
          <span
            v-if="item.coverTitle"
            class="cover-label"
          >{{ item.coverTitle }}</span>
          <span
            v-if="item.coverSub"
            class="subtitle"
          >{{ item.coverSub }}</span>
          <span class="meta">
            <b>¥{{ fenToYuan(item.priceFen) }}</b>
            <small>已售 {{ item.sold }}</small>
          </span>
        </div>
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
  min-height: 156px;
  padding: 16px;
}

.group-head {
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sec-title {
  min-width: 0;
  font-size: 16px;
  letter-spacing: 0;
}

.group-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-count {
  flex-shrink: 0;
  font-family: var(--font-num);
  font-size: 11px;
  color: var(--c-text-muted);
}

.grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  column-gap: 16px;
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
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  object-fit: cover;
}

.cat-icon-text {
  max-width: 84px;
  padding: 2px 6px;
  font-size: 11px;
  font-style: normal;
  font-weight: 700;
  letter-spacing: 0;
  color: var(--c-neon);
  border: 1px solid rgba(61, 255, 155, 0.45);
  border-radius: var(--radius-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item {
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 94px;
  padding: 10px 4px;
  border-top: 1px solid var(--c-border);
  text-align: left;
  transition: background 0.2s ease;
}

.item:hover {
  background: rgba(61, 255, 155, 0.06);
}

.item-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.name {
  font-size: 14px;
  color: var(--c-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cover-label,
.subtitle {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cover-label {
  font-weight: 700;
  color: var(--c-neon);
}

.subtitle {
  color: var(--c-text-secondary);
}

.meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.meta b {
  font-family: var(--font-num);
  font-size: 15px;
  color: var(--c-accent);
}

.meta small {
  font-size: 10px;
  color: var(--c-text-muted);
  white-space: nowrap;
}
</style>
