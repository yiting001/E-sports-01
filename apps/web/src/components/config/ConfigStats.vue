<script setup lang="ts">
defineProps<{
  total: number;
  groupCount: number;
  secretCount: number;
  richTextCount: number;
}>();
</script>

<template>
  <section
    class="config-stats"
    aria-label="配置概览"
  >
    <article class="config-stat">
      <span>配置总数</span>
      <strong>{{ total }}</strong>
      <small>当前已登记的运行参数</small>
    </article>
    <article class="config-stat">
      <span>覆盖分组</span>
      <strong>{{ groupCount }}</strong>
      <small>按业务域聚合配置项</small>
    </article>
    <article class="config-stat">
      <span>敏感配置</span>
      <strong>{{ secretCount }}</strong>
      <small>列表中默认脱敏展示</small>
    </article>
    <article class="config-stat">
      <span>富文本</span>
      <strong>{{ richTextCount }}</strong>
      <small>使用富文本编辑器维护</small>
    </article>
  </section>
</template>
