<script setup lang="ts">
/**
 * 特效嵌套器：把特效组件列表自外向内递归包裹插槽内容。
 * 列表为空时直接渲染内容，供 ThemeEffectLayer 支持同时启用任意多个特效。
 * 递归引用依赖 SFC 文件名自引用能力（Vue 3.2+）。
 */
import { computed, type Component } from 'vue';

const props = defineProps<{ components: Component[] }>();

const rest = computed(() => props.components.slice(1));
</script>

<template>
  <component
    :is="components[0]"
    v-if="props.components.length > 0"
  >
    <ThemeEffectNest :components="rest">
      <slot />
    </ThemeEffectNest>
  </component>
  <slot v-else />
</template>
