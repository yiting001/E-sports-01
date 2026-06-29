<script setup lang="ts">
defineProps<{
  total: number;
  pendingCount: number;
  approvedCount: number;
  requiredRoleCount: number;
}>();
</script>

<template>
  <section
    class="realname-stats"
    aria-label="实名审核概览"
  >
    <article class="realname-stat">
      <span>审核记录</span>
      <strong>{{ total }}</strong>
      <small>当前筛选条件下的实名申请</small>
    </article>
    <article class="realname-stat">
      <span>待审核</span>
      <strong>{{ pendingCount }}</strong>
      <small>需要管理员处理的申请</small>
    </article>
    <article class="realname-stat">
      <span>已通过</span>
      <strong>{{ approvedCount }}</strong>
      <small>本页已完成认证的用户</small>
    </article>
    <article class="realname-stat">
      <span>策略角色</span>
      <strong>{{ requiredRoleCount }}</strong>
      <small>要求完成实名的角色数量</small>
    </article>
  </section>
</template>
