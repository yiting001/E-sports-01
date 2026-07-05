<script setup lang="ts">
/**
 * 星级评分组件：展示 1-5 星；传入 interactive 后可点选打分（v-model）。
 * 展示与打分共用同一组件，保证商品详情/评论弹窗的星星风格一致。
 */
import { REVIEW_LIMITS } from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';

const props = withDefaults(
  defineProps<{
    /** 当前星级 */
    modelValue: number;
    /** 是否可点选打分 */
    interactive?: boolean;
    /** 星星边长（px） */
    size?: number;
  }>(),
  { interactive: false, size: 16 },
);

const emit = defineEmits<{ 'update:modelValue': [value: number] }>();

const STARS = Array.from(
  { length: REVIEW_LIMITS.ratingMax },
  (_, i) => i + REVIEW_LIMITS.ratingMin,
);

function select(value: number): void {
  if (props.interactive) {
    emit('update:modelValue', value);
  }
}
</script>

<template>
  <span
    class="stars"
    :class="{ 'stars--interactive': interactive }"
    role="img"
    :aria-label="`${modelValue} 星`"
  >
    <button
      v-for="value in STARS"
      :key="value"
      type="button"
      class="star"
      :class="{ 'star--on': value <= modelValue }"
      :disabled="!interactive"
      :aria-label="`${value} 星`"
      @click="select(value)"
    >
      <AppIcon
        name="star"
        :size="size"
      />
    </button>
  </span>
</template>

<style scoped>
.stars {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.star {
  display: grid;
  place-items: center;
  padding: 0;
  color: var(--c-text-muted);
  background: none;
  border: none;
}

.stars--interactive .star {
  padding: 2px;
  cursor: pointer;
}

.star--on {
  color: var(--c-accent);
}

.star--on :deep(path) {
  fill: currentcolor;
}
</style>
