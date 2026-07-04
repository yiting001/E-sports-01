<script setup lang="ts">
/**
 * 主布局：负责响应式导航切换。
 * 移动端（<768px）：底部悬浮 TabBar；PC 端（>=768px）：顶部导航条 + 居中内容容器。
 * 断点由 CSS 媒体查询控制，两套导航同时渲染、按视口显隐，避免 JS 侦听窗口尺寸。
 * 页面底色与网格纹理由 base.css 的 body 统一绘制。
 */
import AppTabBar from '@/components/common/AppTabBar.vue';
import AppTopNav from '@/components/common/AppTopNav.vue';
</script>

<template>
  <div class="layout">
    <AppTopNav class="top-nav" />
    <main class="page">
      <router-view />
    </main>
    <AppTabBar class="tab-bar" />
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
}

.page {
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: 12px 12px calc(var(--tabbar-height) + 24px);
}

/* 移动端隐藏顶部导航 */
.top-nav {
  display: none;
}

/* PC 端：显示顶部导航、隐藏底部 TabBar，内容不再为 TabBar 留白 */
@media (min-width: 768px) {
  .top-nav {
    display: block;
  }
  .tab-bar {
    display: none;
  }
  .page {
    padding: 24px 24px 48px;
  }
}
</style>
