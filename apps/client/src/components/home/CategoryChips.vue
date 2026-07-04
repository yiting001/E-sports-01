<script setup lang="ts">
/**
 * 商品分类签横滑条：单选高亮（战术金切角），移动端可横向滚动，PC 端自动换行。
 */
defineProps<{
  /** 分类文案列表 */
  chips: string[];
  /** 当前激活下标 */
  modelValue: number;
}>();

const emit = defineEmits<{ 'update:modelValue': [index: number] }>();
</script>

<template>
  <div class="chips no-scrollbar">
    <button
      v-for="(chip, index) in chips"
      :key="chip"
      class="chip"
      :class="{ active: index === modelValue }"
      @click="emit('update:modelValue', index)"
    >
      {{ chip }}
    </button>
  </div>
</template>

<style scoped>
.chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.chip {
  flex-shrink: 0;
  padding: 8px 14px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  font-size: 13px;
  color: var(--c-text-secondary);
  transition: all 0.2s ease;
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}

.chip.active {
  background: var(--c-accent);
  border-color: var(--c-accent);
  color: var(--c-bg);
  font-weight: 700;
  font-style: italic;
}

/* PC 端不滚动，直接换行铺开 */
@media (min-width: 768px) {
  .chips {
    flex-wrap: wrap;
    overflow-x: visible;
  }
}
</style>
