<script setup lang="ts">
import { UserFilled } from '@element-plus/icons-vue';
</script>

<template>
  <header class="user-hero">
    <div class="user-hero__content">
      <span class="user-eyebrow">Identity Control</span>
      <h1>用户管理</h1>
      <p>集中维护账号、状态、手机号和角色归属，保证人员权限与业务边界同步可控。</p>
    </div>
    <div
      class="user-hero__visual"
      aria-hidden="true"
    >
      <div class="user-orbit">
        <span class="user-orbit__ring ring-a" />
        <span class="user-orbit__ring ring-b" />
        <span class="user-core">
          <el-icon><UserFilled /></el-icon>
        </span>
        <span class="user-dot dot-a" />
        <span class="user-dot dot-b" />
        <span class="user-dot dot-c" />
      </div>
    </div>
  </header>
</template>
