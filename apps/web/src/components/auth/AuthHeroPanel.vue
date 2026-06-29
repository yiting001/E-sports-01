<script setup lang="ts">
import { Check, Trophy } from '@element-plus/icons-vue';
import { useBrandingStore } from '@/stores/branding.store';
import './AuthHeroPanel.css';

const branding = useBrandingStore();

const features = ['赛事运营与数据看板', '角色权限精细管控', '消息协同与内容管理'];
</script>

<template>
  <aside class="auth-hero">
    <div class="hero-inner">
      <div class="brand-line">
        <span class="brand-mark">
          <img
            v-if="branding.appLogo"
            :src="branding.appLogo"
            class="brand-logo"
            alt="logo"
          >
          <el-icon v-else><Trophy /></el-icon>
        </span>
        <span>{{ branding.appName }}</span>
      </div>

      <section class="hero-copy">
        <h1>统一运营入口</h1>
        <span>聚合赛事、权限、消息与内容管理能力，适配电竞业务和通用运营场景。</span>
      </section>

      <ul class="hero-features">
        <li
          v-for="item in features"
          :key="item"
        >
          <el-icon><Check /></el-icon>
          <span>{{ item }}</span>
        </li>
      </ul>
    </div>
  </aside>
</template>
