<script setup lang="ts">
/**
 * 通用 SVG 图标组件：按名称渲染 icon-paths 注册表中的线性图标。
 * 统一 currentColor 描边，颜色随父级文字色继承；尺寸由 size 控制。
 */
import { ICON_PATHS, type IconName } from '@/config/icon-paths';

withDefaults(
  defineProps<{
    /** 图标名（见 icon-paths.ts 注册表） */
    name: IconName;
    /** 边长（px） */
    size?: number;
  }>(),
  { size: 20 },
);
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path
      v-for="(d, i) in ICON_PATHS[name]"
      :key="i"
      :d="d"
    />
  </svg>
</template>
