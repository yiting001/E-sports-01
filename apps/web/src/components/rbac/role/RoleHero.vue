<script setup lang="ts">
import { Key } from '@element-plus/icons-vue';
</script>

<template>
  <header class="role-hero">
    <div class="role-hero__content">
      <span class="role-eyebrow">Access Roles</span>
      <h1>角色管理</h1>
      <p>统一维护角色编码、角色说明与权限范围，让账号授权边界清晰可追踪。</p>
    </div>
    <div
      class="role-hero__visual"
      aria-hidden="true"
    >
      <div class="role-sigil">
        <span class="role-sigil__rail role-rail-a" />
        <span class="role-sigil__rail role-rail-b" />
        <span class="role-sigil__rail role-rail-c" />
        <span class="role-core">
          <el-icon><Key /></el-icon>
        </span>
        <span class="role-node role-node-a" />
        <span class="role-node role-node-b" />
        <span class="role-node role-node-c" />
      </div>
    </div>
  </header>
</template>
