<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';

const props = withDefaults(
  defineProps<{
    data: unknown[];
    loading?: boolean;
    minWidth?: number | string;
    tableClass?: string;
    emptyText?: string;
  }>(),
  {
    loading: false,
    minWidth: 900,
    tableClass: '',
    emptyText: '暂无数据',
  },
);

const tableMinWidth = computed(() =>
  typeof props.minWidth === 'number' ? `${props.minWidth}px` : props.minWidth,
);
const tableStyle = computed<CSSProperties>(() => ({
  width: '100%',
  minWidth: tableMinWidth.value,
}));
</script>

<template>
  <div class="app-data-table">
    <el-table
      v-loading="loading"
      :data="data"
      :empty-text="emptyText"
      class="app-data-table__table"
      :class="tableClass"
      :style="tableStyle"
    >
      <slot />
    </el-table>
  </div>
</template>

<style scoped>
.app-data-table {
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  border: 1px solid var(--app-border-color);
  border-radius: 4px;
  background: var(--app-surface-color);
}

.app-data-table__table {
  width: 100%;
}

.app-data-table__table :deep(.el-table__header th) {
  color: var(--app-text-secondary);
  font-weight: 600;
  background: var(--app-muted-bg);
}

.app-data-table__table :deep(.el-table__cell) {
  padding: 12px 0;
}

.app-data-table__table :deep(.el-table__inner-wrapper::before) {
  display: none;
}
</style>
