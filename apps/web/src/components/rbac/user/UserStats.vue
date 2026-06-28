<script setup lang="ts">
defineProps<{
  total: number;
  enabledCount: number;
  phoneBoundCount: number;
  assignedCount: number;
}>();
</script>

<template>
  <section
    class="user-stats"
    aria-label="用户概览"
  >
    <article class="user-stat">
      <span>用户总数</span>
      <strong>{{ total }}</strong>
      <small>当前权限范围内的账号数</small>
    </article>
    <article class="user-stat">
      <span>本页启用</span>
      <strong>{{ enabledCount }}</strong>
      <small>可正常登录与访问系统</small>
    </article>
    <article class="user-stat">
      <span>绑定手机</span>
      <strong>{{ phoneBoundCount }}</strong>
      <small>支持短信验证码登录</small>
    </article>
    <article class="user-stat">
      <span>已分配角色</span>
      <strong>{{ assignedCount }}</strong>
      <small>至少绑定一个角色</small>
    </article>
  </section>
</template>
