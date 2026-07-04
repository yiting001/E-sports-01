<script setup lang="ts">
/**
 * PC 端顶部导航条：品牌切角徽标 + 四个一级页签（底部金色指示线），与移动端共用导航配置。
 */
import AppIcon from '@/components/common/AppIcon.vue';
import { NAV_ITEMS } from '@/config/nav';
</script>

<template>
  <header class="topnav">
    <div class="inner">
      <div class="brand">
        <span class="logo">
          <AppIcon
            name="gamepad"
            :size="18"
          />
        </span>
        <span class="name">电竞陪练商城</span>
      </div>
      <nav class="links">
        <router-link
          v-for="item in NAV_ITEMS"
          :key="item.name"
          :to="{ name: item.name }"
          class="link"
          :class="{ active: $route.name === item.name }"
        >
          {{ item.label }}
        </router-link>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.topnav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(11, 14, 20, 0.85);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--c-border);
}

.inner {
  max-width: var(--page-max-width);
  margin: 0 auto;
  height: 58px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  font-style: italic;
  font-size: 17px;
  letter-spacing: 1px;
}

.logo {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  background: var(--c-accent);
  color: var(--c-bg);
  clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
}

.links {
  display: flex;
  gap: 4px;
  height: 100%;
}

.link {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0 18px;
  height: 58px;
  font-size: 14px;
  letter-spacing: 2px;
  color: var(--c-text-secondary);
  transition: color 0.2s ease;
}

.link::after {
  content: '';
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 0;
  height: 2px;
  background: transparent;
  transform: skewX(-18deg);
  transition: background 0.2s ease;
}

.link:hover {
  color: var(--c-text);
}

.link.active {
  color: var(--c-accent);
  font-weight: 700;
}

.link.active::after {
  background: var(--c-accent);
  box-shadow: 0 0 8px var(--c-accent);
}
</style>
