<script setup lang="ts">
/**
 * 通用胶囊分段页签（综合/排行榜、登录/注册等场景共用）。
 * 通过 v-model 双向绑定当前激活项；激活态为战术金底黑字。
 */
defineProps<{
  /** 页签文案列表 */
  tabs: string[];
  /** 当前激活下标 */
  modelValue: number;
}>();

const emit = defineEmits<{ 'update:modelValue': [index: number] }>();
</script>

<template>
  <div class="segment card">
    <button
      v-for="(tab, index) in tabs"
      :key="tab"
      class="seg-btn"
      :class="{ active: index === modelValue }"
      @click="emit('update:modelValue', index)"
    >
      {{ tab }}
    </button>
  </div>
</template>

<style scoped>
.segment {
  display: flex;
  padding: 5px;
  gap: 5px;
}

.seg-btn {
  flex: 1;
  padding: 10px 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--c-text-muted);
  transition: all 0.2s ease;
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}

.seg-btn.active {
  background: var(--c-accent);
  color: var(--c-bg);
  font-style: italic;
}
</style>
