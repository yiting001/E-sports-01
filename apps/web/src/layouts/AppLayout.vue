<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ArrowDown,
  Fold,
  HomeFilled,
  Postcard,
  SwitchButton,
  User,
  UserFilled,
  Wallet,
} from '@element-plus/icons-vue';
import AppMenu from './AppMenu.vue';
import { useMenus } from '@/composables/use-menus';
import { useAuthStore } from '@/stores/auth.store';
import { useMenuStore } from '@/stores/menu.store';
import { useBrandingStore } from '@/stores/branding.store';
import './AppLayout.css';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const menuStore = useMenuStore();
const branding = useBrandingStore();
const { menus } = useMenus();

const mobileMenuVisible = ref(false);
const activePath = computed(() => route.path);
const userName = computed(() => auth.profile?.nickname || auth.profile?.username || '-');
const roleText = computed(() => (auth.profile?.isSuper ? '超级管理员' : '授权账号'));
const avatarUrl = computed(() => auth.profile?.avatar || '');

function onLogout(): void {
  auth.logout();
  menuStore.reset();
  void router.push({ name: 'login' });
}

function goProfile(): void {
  void router.push({ name: 'profile' });
}

function goWallet(): void {
  void router.push({ name: 'wallet-mine' });
}

function goRealname(): void {
  void router.push({ name: 'realname-me' });
}

function closeMobileMenu(): void {
  mobileMenuVisible.value = false;
}
</script>

<template>
  <el-container class="layout-shell">
    <el-aside class="app-aside">
      <div class="brand-block">
        <span class="brand-mark">
          <img
            v-if="branding.appLogo"
            :src="branding.appLogo"
            class="brand-logo"
            alt="logo"
          >
          <el-icon v-else><HomeFilled /></el-icon>
        </span>
        <div>
          <strong>{{ branding.appName }}</strong>
          <small>Operations Console</small>
        </div>
      </div>

      <app-menu
        :menus="menus"
        :active-path="activePath"
      />

      <div class="aside-user">
        <span class="aside-avatar">
          <img
            v-if="avatarUrl"
            :src="avatarUrl"
            class="aside-avatar-img"
            alt="头像"
          >
          <el-icon v-else><UserFilled /></el-icon>
        </span>
        <div>
          <strong>{{ userName }}</strong>
          <small>{{ roleText }}</small>
        </div>
      </div>
    </el-aside>

    <el-container class="layout-main">
      <el-header class="app-header">
        <div class="header-left">
          <el-button
            class="mobile-menu-button"
            :icon="Fold"
            circle
            @click="mobileMenuVisible = true"
          />
          <div>
            <p>{{ route.meta.title || '工作台' }}</p>
            <span>{{ branding.appName }}</span>
          </div>
        </div>

        <el-dropdown trigger="click">
          <button
            class="user-trigger"
            type="button"
          >
            <span class="header-avatar">
              <img
                v-if="avatarUrl"
                :src="avatarUrl"
                class="header-avatar-img"
                alt="头像"
              >
              <el-icon v-else><UserFilled /></el-icon>
            </span>
            <span class="user-name">{{ userName }}</span>
            <el-icon><ArrowDown /></el-icon>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item disabled>
                {{ roleText }}
              </el-dropdown-item>
              <el-dropdown-item
                divided
                @click="goProfile"
              >
                <el-icon><User /></el-icon>
                个人中心
              </el-dropdown-item>
              <el-dropdown-item @click="goWallet">
                <el-icon><Wallet /></el-icon>
                我的钱包
              </el-dropdown-item>
              <el-dropdown-item @click="goRealname">
                <el-icon><Postcard /></el-icon>
                我的实名
              </el-dropdown-item>
              <el-dropdown-item
                divided
                @click="onLogout"
              >
                <el-icon><SwitchButton /></el-icon>
                退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>

      <el-main class="main">
        <router-view v-slot="{ Component, route: currentRoute }">
          <transition
            name="page-route"
            mode="out-in"
            appear
          >
            <component
              :is="Component"
              :key="currentRoute.fullPath"
            />
          </transition>
        </router-view>
      </el-main>
    </el-container>

    <el-drawer
      v-model="mobileMenuVisible"
      class="mobile-menu-drawer"
      direction="ltr"
      size="304px"
      :with-header="false"
    >
      <div class="brand-block drawer-brand">
        <span class="brand-mark">
          <img
            v-if="branding.appLogo"
            :src="branding.appLogo"
            class="brand-logo"
            alt="logo"
          >
          <el-icon v-else><HomeFilled /></el-icon>
        </span>
        <div>
          <strong>{{ branding.appName }}</strong>
          <small>Operations Console</small>
        </div>
      </div>

      <app-menu
        :menus="menus"
        :active-path="activePath"
        class="drawer-menu"
        @select="closeMobileMenu"
      />
    </el-drawer>
  </el-container>
</template>
