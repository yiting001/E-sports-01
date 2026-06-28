<script setup lang="ts">
defineProps<{
  total: number;
  builtinCount: number;
  configurableCount: number;
  permissionCount: number;
}>();
</script>

<template>
  <section
    class="role-stats"
    aria-label="角色概览"
  >
    <article class="role-stat">
      <span>角色总数</span>
      <strong>{{ total }}</strong>
      <small>当前权限范围内的角色数</small>
    </article>
    <article class="role-stat">
      <span>内置角色</span>
      <strong>{{ builtinCount }}</strong>
      <small>平台预置的全局授权角色</small>
    </article>
    <article class="role-stat">
      <span>可配置角色</span>
      <strong>{{ configurableCount }}</strong>
      <small>支持维护名称与权限范围</small>
    </article>
    <article class="role-stat">
      <span>已绑定权限</span>
      <strong>{{ permissionCount }}</strong>
      <small>本页角色关联的权限数量</small>
    </article>
  </section>
</template>
