<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { computed } from 'vue';
import { useMenus } from '@/composables/use-menus';
import { useAuthStore } from '@/stores/auth.store';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const { menus } = useMenus();

const activePath = computed(() => route.path);

function go(path: string): void {
  void router.push(path);
}

function onLogout(): void {
  auth.logout();
  void router.push({ name: 'login' });
}
</script>

<template>
  <el-container class="layout">
    <el-aside
      width="220px"
      class="aside"
    >
      <div class="logo">
        基础设施平台
      </div>
      <el-menu
        :default-active="activePath"
        router
      >
        <el-menu-item
          v-for="item in menus"
          :key="item.path"
          :index="item.path"
          @click="go(item.path)"
        >
          {{ item.title }}
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <span class="title">{{ route.meta.title }}</span>
        <div class="user">
          <span>{{ auth.profile?.nickname || auth.profile?.username }}</span>
          <el-button
            type="primary"
            link
            @click="onLogout"
          >
            退出登录
          </el-button>
        </div>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout {
  height: 100vh;
}
.aside {
  background: #001529;
}
.logo {
  height: 56px;
  line-height: 56px;
  text-align: center;
  color: #fff;
  font-weight: 600;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
}
.title {
  font-weight: 600;
}
.user {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
