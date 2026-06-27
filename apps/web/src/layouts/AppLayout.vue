<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { computed } from 'vue';
import { useMenus } from '@/composables/use-menus';
import { useAuthStore } from '@/stores/auth.store';
import { useMenuStore } from '@/stores/menu.store';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const menuStore = useMenuStore();
const { menus } = useMenus();

const activePath = computed(() => route.path);

function onLogout(): void {
  auth.logout();
  menuStore.reset();
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
        background-color="#001529"
        text-color="#c0c4cc"
        active-text-color="#ffffff"
        router
      >
        <template
          v-for="item in menus"
          :key="item.key"
        >
          <el-sub-menu
            v-if="item.children"
            :index="item.key"
          >
            <template #title>
              <el-icon v-if="item.icon">
                <component :is="item.icon" />
              </el-icon>
              <span>{{ item.title }}</span>
            </template>
            <el-menu-item
              v-for="child in item.children"
              :key="child.key"
              :index="child.path"
            >
              <el-icon v-if="child.icon">
                <component :is="child.icon" />
              </el-icon>
              <span>{{ child.title }}</span>
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item
            v-else
            :index="item.path"
          >
            <el-icon v-if="item.icon">
              <component :is="item.icon" />
            </el-icon>
            <span>{{ item.title }}</span>
          </el-menu-item>
        </template>
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
.aside :deep(.el-menu) {
  border-right: none;
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
