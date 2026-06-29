<script setup lang="ts">
import { CircleCheck, Clock, Postcard } from '@element-plus/icons-vue';
</script>

<template>
  <header class="realname-hero">
    <div class="realname-hero__content">
      <span class="realname-eyebrow">Identity Review</span>
      <h1>实名管理</h1>
      <p>集中处理用户实名审核、证件资料核验与角色准入策略，确保关键操作前的身份状态清晰可追踪。</p>
    </div>
    <div
      class="realname-hero__visual"
      aria-hidden="true"
    >
      <div class="realname-orbit">
        <span class="realname-orbit__rail orbit-rail-a" />
        <span class="realname-orbit__rail orbit-rail-b" />
        <span class="realname-orbit__rail orbit-rail-c" />
        <span class="realname-core">
          <el-icon><Postcard /></el-icon>
        </span>
        <span class="realname-node realname-node-a">
          <el-icon><Clock /></el-icon>
        </span>
        <span class="realname-node realname-node-b">
          <el-icon><CircleCheck /></el-icon>
        </span>
      </div>
    </div>
  </header>
</template>
