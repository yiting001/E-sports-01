<script setup lang="ts">
/**
 * 分类页（全部游戏）：顶部「综合 / 排行榜」分段页签。
 * 综合 → 分组网格；排行榜 → 热度榜单列表（带名次编号）。
 */
import { ref } from 'vue';
import CategoryGroupCard from '@/components/category/CategoryGroupCard.vue';
import RankItemCard from '@/components/category/RankItemCard.vue';
import SegmentTabs from '@/components/common/SegmentTabs.vue';
import { CATEGORY_GROUPS, RANK_LIST } from '@/config/category.mock';

/** 页签文案（下标与 activeTab 对应） */
const TABS = ['综合', '排行榜'];
const activeTab = ref(0);
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
        v-for="group in CATEGORY_GROUPS"
        :key="group.id"
        :group="group"
      />
    </template>

    <!-- 排行榜：热度榜单 -->
    <template v-else>
      <RankItemCard
        v-for="(item, index) in RANK_LIST"
        :key="item.id"
        :item="item"
        :index="index"
      />
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
</style>
