<script setup lang="ts">
/**
 * 移动端底部导航条：切角深色面板，激活项战术金高亮 + 顶部指示线。
 */
import AppIcon from '@/components/common/AppIcon.vue';
import { NAV_ITEMS } from '@/config/nav';
</script>

<template>
  <nav class="tabbar">
    <router-link
      v-for="item in NAV_ITEMS"
      :key="item.name"
      :to="{ name: item.name }"
      class="tab"
      :class="{ active: $route.name === item.name }"
    >
      <span class="indicator" />
      <AppIcon
        :name="item.icon"
        :size="21"
      />
      <span class="label">{{ item.label }}</span>
    </router-link>
  </nav>
</template>

<style scoped>
.tabbar {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: 10px;
  z-index: 100;
  height: var(--tabbar-height);
  display: flex;
  align-items: stretch;
  background: linear-gradient(180deg, rgba(26, 33, 48, 0.96), rgba(15, 19, 28, 0.96));
  border: 1px solid var(--c-border);
  backdrop-filter: blur(10px);
  clip-path: polygon(
    var(--chamfer) 0,
    100% 0,
    100% calc(100% - var(--chamfer)),
    calc(100% - var(--chamfer)) 100%,
    0 100%,
    0 var(--chamfer)
  );
}

.tab {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: var(--c-text-muted);
  transition: color 0.2s ease;
}

.indicator {
  position: absolute;
  top: 0;
  width: 26px;
  height: 2px;
  background: transparent;
  transition: background 0.2s ease;
}

.tab .label {
  font-size: 11px;
  letter-spacing: 1px;
}

.tab.active {
  color: var(--c-accent);
}

.tab.active .indicator {
  background: var(--c-accent);
  box-shadow: 0 0 8px var(--c-accent);
}
</style>
