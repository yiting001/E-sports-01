<script setup lang="ts">
import { OfficeBuilding } from '@element-plus/icons-vue';
</script>

<template>
  <header class="tenant-hero">
    <div class="tenant-hero__content">
      <span class="tenant-eyebrow">Tenant Control</span>
      <h1>租户管理</h1>
      <p>统一维护平台租户、启停状态与初始化管理员账号，支撑多业务空间的数据隔离。</p>
    </div>
    <div
      class="tenant-hero__visual"
      aria-hidden="true"
    >
      <div class="tenant-network">
        <span class="tenant-network__line line-a" />
        <span class="tenant-network__line line-b" />
        <span class="tenant-node node-primary">
          <el-icon><OfficeBuilding /></el-icon>
        </span>
        <span class="tenant-node node-a" />
        <span class="tenant-node node-b" />
        <span class="tenant-node node-c" />
      </div>
    </div>
  </header>
</template>
