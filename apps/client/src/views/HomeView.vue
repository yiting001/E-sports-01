<script setup lang="ts">
import { useRouter } from 'vue-router';
import { SwitchButton, Trophy } from '@element-plus/icons-vue';
import { useAuthStore } from '@/stores/auth.store';
import './HomeView.css';

const auth = useAuthStore();
const router = useRouter();

/** 退出登录并回到登录页 */
async function logout(): Promise<void> {
  auth.logout();
  await router.push({ name: 'login' });
}
</script>

<template>
  <div class="home-page">
    <header class="home-bar">
      <div class="home-brand">
        <span class="home-mark"><el-icon><Trophy /></el-icon></span>
        <span>电竞玩家中心</span>
      </div>
      <el-button
        text
        :icon="SwitchButton"
        @click="logout"
      >
        退出登录
      </el-button>
    </header>

    <main class="home-body">
      <section class="welcome-card">
        <p class="welcome-eyebrow">
          Welcome Back
        </p>
        <h1>你好，{{ auth.displayName }}</h1>
        <span>你已使用短信验证码登录玩家中心。</span>

        <ul class="profile-list">
          <li>
            <span>手机号</span>
            <b>{{ auth.profile?.phone || '未绑定' }}</b>
          </li>
          <li>
            <span>角色</span>
            <b>{{ (auth.profile?.roles ?? []).join('、') || '普通会员' }}</b>
          </li>
          <li>
            <span>所属租户</span>
            <b>{{ auth.profile?.tenantName || '默认租户' }}</b>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>
