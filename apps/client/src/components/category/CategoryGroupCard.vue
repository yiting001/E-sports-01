<script setup lang="ts">
/** 分类目录分组：标题居中，下面以圆形入口展示全部商品和上架商品。 */
import { useRouter } from 'vue-router';
import type { CategoryGroup } from '@/config/category.mock';
import ProductCoverThumb from '@/components/product/ProductCoverThumb.vue';

defineProps<{ group: CategoryGroup }>();

const emit = defineEmits<{ 'show-all': [categoryId: string] }>();
const router = useRouter();

function openProduct(productId: string): void {
  void router.push(`/products/${productId}`);
}
</script>

<template>
  <section class="group">
    <header class="group-head">
      <span class="rule" />
      <h2 class="group-title">
        {{ group.title }}
      </h2>
      <span class="group-count">{{ group.items.length }} 项</span>
      <span class="rule" />
    </header>

    <div
      v-if="group.items.length"
      class="directory-grid"
    >
      <button
        type="button"
        class="directory-item directory-item--all"
        :aria-label="`查看${group.title}全部商品`"
        @click="emit('show-all', group.id)"
      >
        <ProductCoverThumb
          :src="group.icon"
          :fallback="group.iconText || group.title.slice(0, 2)"
          variant="circle"
        />
        <span class="item-label">全部商品</span>
      </button>

      <button
        v-for="item in group.items"
        :key="item.id"
        type="button"
        class="directory-item"
        :aria-label="`查看商品${item.title}`"
        @click="openProduct(item.id)"
      >
        <ProductCoverThumb
          :src="item.cover"
          :fallback="item.coverTitle || item.title"
          variant="circle"
        />
        <span class="item-label">{{ item.title }}</span>
        <span
          v-if="item.coverSub"
          class="item-subtitle"
        >{{ item.coverSub }}</span>
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
  padding: 4px 4px 24px;
  border-bottom: 1px solid var(--c-border);
}

.group + .group {
  padding-top: 22px;
}

.group-head {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.rule {
  flex: 1;
  height: 1px;
  min-width: 12px;
  background: var(--c-border);
}

.group-title {
  max-width: 55%;
  overflow: hidden;
  color: var(--c-text);
  font-size: 15px;
  font-weight: 800;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-count {
  flex-shrink: 0;
  color: var(--c-text-muted);
  font-family: var(--font-num);
  font-size: 10px;
}

.directory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
  justify-items: center;
  gap: 20px 12px;
  margin: 20px auto 0;
}

.directory-item {
  width: 86px;
  min-height: 106px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 2px 1px;
  color: var(--c-text-secondary);
  text-align: center;
  transition: color 0.2s ease, transform 0.2s ease;
}

.directory-item:hover,
.directory-item:focus-visible {
  color: var(--c-accent);
  transform: translateY(-2px);
}

.directory-item :deep(.product-cover-thumb) {
  --product-thumb-size: 58px;
}

.item-label {
  width: 100%;
  min-height: 30px;
  display: -webkit-box;
  overflow: hidden;
  font-size: 11px;
  line-height: 15px;
  text-align: center;
  text-overflow: ellipsis;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.item-subtitle {
  width: 100%;
  overflow: hidden;
  color: var(--c-text-muted);
  font-size: 10px;
  line-height: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.directory-item--all {
  color: var(--c-accent);
}

.group-empty {
  padding: 30px 12px 8px;
  color: var(--c-text-muted);
  font-size: 12px;
  text-align: center;
}

@media (min-width: 768px) {
  .group {
    padding-inline: 12px;
  }

  .directory-grid {
    grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
    gap: 24px 18px;
  }

  .directory-item {
    width: 100px;
  }

  .directory-item :deep(.product-cover-thumb) {
    --product-thumb-size: 68px;
  }
}
</style>
