<script setup lang="ts">
/**
 * 主题特效层：按租户拉取后台启用的 Canvas UI 背景特效并逐层包裹页面内容。
 * 可同时启用多个特效（自外向内嵌套）；未启用或接口失败时直接渲染内容，零开销。
 * 特效组件按需懒加载，不进入首屏包；浏览器不支持 html-in-canvas 时内容自动降级为普通 HTML。
 */
import {
  computed,
  defineAsyncComponent,
  onMounted,
  ref,
  type Component,
} from "vue";
import { ThemeEffect } from "@app/contracts";
import { themeApi } from "@/api/theme.api";
import { tenantContext } from "@/tenant/tenant-context";
import ThemeEffectNest from "./ThemeEffectNest.vue";

/** 特效枚举 → 懒加载组件映射；新增特效时在此登记 */
const EFFECT_COMPONENTS: Record<ThemeEffect, Component> = {
  [ThemeEffect.Clouds]: defineAsyncComponent(
    () => import("../canvasui/Clouds.vue")
  ),
  [ThemeEffect.Blaze]: defineAsyncComponent(
    () => import("../canvasui/Blaze.vue")
  ),
  [ThemeEffect.Laser]: defineAsyncComponent(
    () => import("../canvasui/Laser.vue")
  ),
  [ThemeEffect.Grid]: defineAsyncComponent(
    () => import("../canvasui/Grid.vue")
  ),
  [ThemeEffect.Frost]: defineAsyncComponent(
    () => import("../canvasui/Frost.vue")
  ),
};

const enabled = ref<ThemeEffect[]>([]);

const components = computed(() =>
  enabled.value.map((effect) => EFFECT_COMPONENTS[effect])
);

onMounted(async () => {
  try {
    const view = await themeApi.effects(tenantContext.getCode());
    enabled.value = view.effects.filter((e) => e in EFFECT_COMPONENTS);
  } catch {
    enabled.value = [];
  }
});
</script>

<template>
  <ThemeEffectNest :components="components">
    <slot />
  </ThemeEffectNest>
</template>
