<script setup lang="ts">
import { Connection } from '@element-plus/icons-vue';
</script>

<template>
  <header class="permission-hero">
    <div class="permission-hero__content">
      <span class="permission-eyebrow">Access Matrix</span>
      <h1>权限管理</h1>
      <p>按业务命名空间维护菜单、按钮与接口权限，保证角色授权范围清晰可审计。</p>
    </div>
    <div
      class="permission-hero__visual"
      aria-hidden="true"
    >
      <div class="permission-map">
        <span class="permission-map__line map-line-a" />
        <span class="permission-map__line map-line-b" />
        <span class="permission-map__line map-line-c" />
        <span class="permission-core">
          <el-icon><Connection /></el-icon>
        </span>
        <span class="permission-token token-a" />
        <span class="permission-token token-b" />
        <span class="permission-token token-c" />
        <span class="permission-token token-d" />
      </div>
    </div>
  </header>
</template>
