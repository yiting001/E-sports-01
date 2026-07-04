<script setup lang="ts">
/**
 * 分类页（全部游戏）：顶部「综合 / 排行榜」分段页签。
 * 数据来自后端公开接口：综合 → 按分类分组的上架商品网格；排行榜 → 按销量降序的热度榜。
 */
import { computed, onMounted, ref } from 'vue';
import type { CategoryPublicView, ProductPublicView } from '@app/contracts';
import CategoryGroupCard from '@/components/category/CategoryGroupCard.vue';
import RankItemCard from '@/components/category/RankItemCard.vue';
import SegmentTabs from '@/components/common/SegmentTabs.vue';
import type { CategoryGroup, RankItem } from '@/config/category.mock';
import { commerceApi } from '@/api/commerce.api';

/** 页签文案（下标与 activeTab 对应） */
const TABS = ['综合', '排行榜'];
const activeTab = ref(0);

const categories = ref<CategoryPublicView[]>([]);
const products = ref<ProductPublicView[]>([]);

/** 综合：按分类聚合商品为分组网格，展示全部启用分类（暂无商品的分类也保留占位） */
const groups = computed<CategoryGroup[]>(() =>
  categories.value.map((category) => ({
    id: category.id,
    title: category.name,
    icon: category.icon,
    iconText: category.cover,
    items: products.value
      .filter((p) => p.categoryId === category.id)
      .map((p) => ({ id: p.id, cover: p.coverTitle, name: p.title })),
  })),
);

/** 排行榜：按销量降序，热度以榜首为 100 基准 */
const ranks = computed<RankItem[]>(() => {
  const sorted = [...products.value].sort((a, b) => b.sold - a.sold).slice(0, 10);
  const top = sorted[0]?.sold ?? 0;
  return sorted.map((p) => ({
    id: p.id,
    title: p.title,
    sold: p.sold,
    heat: top > 0 ? Math.round((p.sold / top) * 100) : 0,
  }));
});

onMounted(async () => {
  const [categoryList, productRes] = await Promise.all([
    commerceApi.listCategories(),
    commerceApi.listProducts({ page: 1, pageSize: 100 }),
  ]);
  categories.value = categoryList;
  products.value = productRes.list;
});
</script>

<template>
  <div class="category">
    <h1 class="page-title">
      全部游戏
    </h1>
    <SegmentTabs
      v-model="activeTab"
      :tabs="TABS"
    />

    <!-- 综合：分组网格 -->
    <template v-if="activeTab === 0">
      <CategoryGroupCard
        v-for="group in groups"
        :key="group.id"
        :group="group"
      />
      <p
        v-if="!groups.length"
        class="empty"
      >
        暂无分类
      </p>
    </template>

    <!-- 排行榜：热度榜单 -->
    <template v-else>
      <RankItemCard
        v-for="(item, index) in ranks"
        :key="item.id"
        :item="item"
        :index="index"
      />
      <p
        v-if="!ranks.length"
        class="empty"
      >
        暂无上架商品
      </p>
    </template>
  </div>
</template>

<style scoped>
.category {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.page-title {
  font-size: 19px;
  font-weight: 800;
  font-style: italic;
  letter-spacing: 2px;
  padding: 2px 4px 0;
}

.empty {
  padding: 40px 0;
  text-align: center;
  color: var(--c-text-muted);
  font-size: 14px;
}
</style>
