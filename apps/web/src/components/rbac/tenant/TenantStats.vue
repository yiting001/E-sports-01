<script setup lang="ts">
defineProps<{
  total: number;
  enabledCount: number;
  normalCount: number;
}>();
</script>

<template>
  <section
    class="tenant-stats"
    aria-label="租户概览"
  >
    <article class="tenant-stat">
      <span>租户总数</span>
      <strong>{{ total }}</strong>
      <small>当前分页条件下的全量结果</small>
    </article>
    <article class="tenant-stat">
      <span>本页启用</span>
      <strong>{{ enabledCount }}</strong>
      <small>可正常登录与访问业务</small>
    </article>
    <article class="tenant-stat">
      <span>普通租户</span>
      <strong>{{ normalCount }}</strong>
      <small>排除内置默认租户</small>
    </article>
  </section>
</template>
