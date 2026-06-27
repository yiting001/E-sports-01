<script setup lang="ts">
defineProps<{
  total: number;
  namespaceCount: number;
  apiCount: number;
  menuCount: number;
  buttonCount: number;
}>();
</script>

<template>
  <section
    class="permission-stats"
    aria-label="权限概览"
  >
    <article class="permission-stat">
      <span>权限总数</span>
      <strong>{{ total }}</strong>
      <small>当前系统已登记的权限点</small>
    </article>
    <article class="permission-stat">
      <span>命名空间</span>
      <strong>{{ namespaceCount }}</strong>
      <small>按权限码自动归档的分组</small>
    </article>
    <article class="permission-stat">
      <span>接口权限</span>
      <strong>{{ apiCount }}</strong>
      <small>后端路由鉴权使用</small>
    </article>
    <article class="permission-stat">
      <span>前端权限</span>
      <strong>{{ menuCount + buttonCount }}</strong>
      <small>菜单 {{ menuCount }} / 按钮 {{ buttonCount }}</small>
    </article>
  </section>
</template>
