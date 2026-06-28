<script setup lang="ts">
import { Setting } from '@element-plus/icons-vue';
</script>

<template>
  <header class="config-hero">
    <div class="config-hero__content">
      <span class="config-eyebrow">Config Center</span>
      <h1>配置中心</h1>
      <p>集中维护平台运行参数、业务开关与敏感凭证，配置变更后由服务端统一失效缓存。</p>
    </div>
    <div
      class="config-hero__visual"
      aria-hidden="true"
    >
      <div class="config-console">
        <span class="config-console__line line-a" />
        <span class="config-console__line line-b" />
        <span class="config-console__line line-c" />
        <span class="config-core">
          <el-icon><Setting /></el-icon>
        </span>
        <span class="config-chip chip-a" />
        <span class="config-chip chip-b" />
        <span class="config-chip chip-c" />
      </div>
    </div>
  </header>
</template>
