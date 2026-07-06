<script setup lang="ts">
/**
 * 订单状态筛选页签：移动端横向滚动，PC 端收敛为居中筛选条。
 */
import type { OrderStatus } from '@app/contracts';

defineProps<{
  tabs: Array<{ label: string; value?: OrderStatus }>;
  activeStatus?: OrderStatus;
}>();

const emit = defineEmits<{
  change: [status: OrderStatus | undefined];
}>();
</script>

<template>
  <nav
    class="tabs"
    aria-label="订单状态筛选"
  >
    <button
      v-for="tab in tabs"
      :key="tab.value ?? 'all'"
      class="tab"
      :class="{ 'tab--active': activeStatus === tab.value }"
      @click="emit('change', tab.value)"
    >
      {{ tab.label }}
    </button>
  </nav>
</template>

<style scoped>
.tabs {
  flex-shrink: 0;
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  overflow-x: auto;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-surface);
  scrollbar-width: none;
}

.tabs::-webkit-scrollbar {
  display: none;
}

.tab {
  flex-shrink: 0;
  padding: 7px 14px;
  font-size: 13px;
  color: var(--c-text-secondary);
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.tab--active {
  color: var(--c-accent);
  font-weight: 800;
  font-style: italic;
  background: color-mix(in srgb, var(--c-accent) 12%, transparent);
}

@media (min-width: 768px) {
  .tabs {
    width: fit-content;
    max-width: min(100%, 860px);
    margin: 12px auto 0;
    padding: 4px;
    flex-wrap: wrap;
    justify-content: center;
    overflow: visible;
    border: 1px solid var(--c-border);
    background: color-mix(in srgb, var(--c-surface) 82%, transparent);
  }

  .tab {
    flex: 0 0 auto;
    min-width: 0;
    padding: 8px 14px;
    text-align: center;
  }

  .tab--active {
    color: var(--c-bg);
    background: var(--c-accent);
  }
}
</style>
