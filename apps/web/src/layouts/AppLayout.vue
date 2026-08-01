<script setup lang="ts">
import { NOTIFY_VOICE_TEXTS, PERMS } from "@app/contracts";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ArrowDown,
  Fold,
  HomeFilled,
  Postcard,
  SwitchButton,
  User,
  UserFilled,
  Wallet,
} from "@element-plus/icons-vue";
import AppMenu from "./AppMenu.vue";
import { AUTH_SESSION_EXPIRED_EVENT } from "@/api/http";
import { tokenStorage } from "@/api/token-storage";
import { createImSocket } from "@/composables/use-im-socket";
import { useMenus } from "@/composables/use-menus";
import { useAuthStore } from "@/stores/auth.store";
import { useMenuStore } from "@/stores/menu.store";
import { MENU_BADGE_CODES, useMenuBadgeStore } from "@/stores/menu-badge.store";
import { useBrandingStore } from "@/stores/branding.store";
import { configApi } from "@/api/config.api";
import { voiceNotifier } from "@/utils/voice-notifier";
import "./AppLayout.css";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const menuStore = useMenuStore();
const menuBadges = useMenuBadgeStore();
const branding = useBrandingStore();
const im = createImSocket();
const { menus } = useMenus();

const mobileMenuVisible = ref(false);
const activePath = computed(() => route.path);
const userName = computed(
  () => auth.profile?.nickname || auth.profile?.username || "-"
);
const roleText = computed(() =>
  auth.profile?.isSuper ? "超级管理员" : "授权账号"
);
const avatarUrl = computed(() => auth.profile?.avatar || "");
let sessionExpiryHandled = false;

/** 语音播报开关（配置中心 notify.voice.enabled 下发，加载失败保持默认开启） */
const voiceNotifyEnabled = ref(true);

void configApi
  .portal()
  .then((portal) => {
    voiceNotifyEnabled.value = portal.voiceNotifyEnabled !== false;
  })
  .catch(() => {
    // 公开配置接口不可用时保持默认开启，不打扰用户
  });

/** 订单待办数增长 → 播报新订单（下发/指派/审核处理后数量下降不播报） */
const stopOrderVoiceWatch = watch(
  () => menuBadges.counts[MENU_BADGE_CODES.order],
  (next, prev) => {
    if (voiceNotifyEnabled.value && next > prev) {
      voiceNotifier.speak("admin-order", NOTIFY_VOICE_TEXTS.newPendingOrder);
    }
  }
);

/** IM 与客服工作台未读合计增长 → 播报新消息 */
const stopMessageVoiceWatch = watch(
  () =>
    menuBadges.counts[MENU_BADGE_CODES.im] +
    menuBadges.counts[MENU_BADGE_CODES.service],
  (next, prev) => {
    if (voiceNotifyEnabled.value && next > prev) {
      voiceNotifier.speak("admin-message", NOTIFY_VOICE_TEXTS.newChatMessage);
    }
  }
);

function clearAuthenticatedSession(): void {
  im.disconnect();
  menuBadges.stopPolling();
  menuBadges.reset();
  auth.logout();
  menuStore.reset();
}

function onLogout(): void {
  clearAuthenticatedSession();
  void router.push({ name: "login" });
}

function onSessionExpired(): void {
  if (sessionExpiryHandled) {
    return;
  }
  sessionExpiryHandled = true;
  clearAuthenticatedSession();
  void router.replace({ name: "login" });
}

function onAuthStorageChange(event: StorageEvent): void {
  const isTokenRemoval =
    event.newValue === null &&
    tokenStorage.isCurrentTenantTokenKey(event.key);
  if (isTokenRemoval) {
    onSessionExpired();
  }
}

function hasMenu(code: string): boolean {
  return menuStore.menus.some((menu) => menu.code === code);
}

function startBadgeRealtime(): void {
  const watchesIm = hasMenu(MENU_BADGE_CODES.im);
  const watchesService =
    hasMenu(MENU_BADGE_CODES.service) &&
    auth.hasPermission(PERMS.im.serviceAgent);
  if (!watchesIm && !watchesService) {
    return;
  }
  im.connect();
  im.onUnreadChanged(() => {
    void menuBadges.refreshConversationBadges();
  });
  im.onConversation(() => {
    void menuBadges.refreshConversationBadges();
  });
  if (watchesService) {
    im.observeService();
    im.onServiceQueued(() => {
      void menuBadges.refreshServiceQueue();
    });
  }
}

function goProfile(): void {
  void router.push({ name: "profile" });
}

function goWallet(): void {
  void router.push({ name: "wallet-mine" });
}

function goRealname(): void {
  void router.push({ name: "realname-me" });
}

function closeMobileMenu(): void {
  mobileMenuVisible.value = false;
}

function refreshVisibleBadges(): void {
  if (document.visibilityState === "visible") {
    void menuBadges.refresh();
  }
}

const removeAfterEach = router.afterEach(() => {
  void menuBadges.refresh();
});

onMounted(() => {
  menuBadges.startPolling();
  startBadgeRealtime();
  document.addEventListener("visibilitychange", refreshVisibleBadges);
  window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, onSessionExpired);
  window.addEventListener("storage", onAuthStorageChange);
});

onBeforeUnmount(() => {
  removeAfterEach();
  stopOrderVoiceWatch();
  stopMessageVoiceWatch();
  menuBadges.stopPolling();
  menuBadges.reset();
  im.disconnect();
  document.removeEventListener("visibilitychange", refreshVisibleBadges);
  window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, onSessionExpired);
  window.removeEventListener("storage", onAuthStorageChange);
});
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
        :badge-counts="menuBadges.counts"
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
            <p>{{ route.meta.title || "工作台" }}</p>
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
        :badge-counts="menuBadges.counts"
        class="drawer-menu"
        @select="closeMobileMenu"
      />
    </el-drawer>
  </el-container>
</template>
