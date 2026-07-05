<script setup lang="ts">
/**
 * 我的页头部：切角头像框（已设头像展示图片）+ 登录入口/昵称 + 等级徽章 + 身份切换。
 * 已登录时点头像/设置进入个人信息编辑页（含退出登录）；未登录时点击「立即登录」跳登录页。
 * 登录态与资料统一取自 auth.store，本组件只做展示与交互编排。
 */
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppIcon from '@/components/common/AppIcon.vue';
import { useToast } from '@/composables/use-toast';
import { useAuthStore } from '@/stores/auth.store';

const auth = useAuthStore();
const toast = useToast();
const router = useRouter();

/** 头部展示的昵称：优先昵称，退化到用户名 */
const displayName = computed(() => auth.profile?.nickname || auth.profile?.username || '');
/** 用户 ID 文案：登录后展示真实 ID，否则占位 */
const uidText = computed(() => (auth.isAuthenticated && auth.profile ? `用户ID: ${auth.profile.id}` : '用户ID: 未登陆'));

/** 进入页面时若已登录但资料未加载则拉取一次 */
onMounted(() => {
  if (auth.isAuthenticated && !auth.profile) {
    void auth.loadProfile();
  }
});

/** 跳转登录页 */
function goLogin(): void {
  void router.push({ name: 'login' });
}

/** 进入个人信息编辑页（含退出登录） */
function goEdit(): void {
  void router.push({ name: 'profile-edit' });
}
</script>

<template>
  <div class="header">
    <button
      v-if="auth.isAuthenticated"
      class="settings"
      title="个人信息"
      @click="goEdit"
    >
      <AppIcon
        name="settings"
        :size="18"
      />
    </button>
    <button
      v-else
      class="settings"
      @click="toast.show('设置页即将上线')"
    >
      <AppIcon
        name="settings"
        :size="18"
      />
    </button>
    <div class="user">
      <component
        :is="auth.isAuthenticated ? 'button' : 'div'"
        class="avatar"
        :style="auth.profile?.avatar ? { backgroundImage: `url(${auth.profile.avatar})` } : undefined"
        @click="auth.isAuthenticated && goEdit()"
      >
        <AppIcon
          v-if="!auth.profile?.avatar"
          name="user"
          :size="34"
        />
      </component>
      <div class="meta">
        <div class="name-row">
          <button
            v-if="!auth.isAuthenticated"
            class="login"
            @click="goLogin"
          >
            立即登录
          </button>
          <span
            v-else
            class="login"
          >
            {{ displayName }}
          </span>
          <span class="level">
            <AppIcon
              name="gem"
              :size="12"
            />
            Lv.1
          </span>
        </div>
        <p class="uid">
          {{ uidText }}
        </p>
      </div>
      <button
        class="switch"
        @click="toast.show('身份切换即将上线')"
      >
        <AppIcon
          name="swap"
          :size="15"
        />
        老板
      </button>
    </div>
  </div>
</template>

<style scoped>
.header {
  position: relative;
  padding: 8px 4px 0;
}

.settings {
  position: absolute;
  top: 0;
  right: 4px;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  color: var(--c-text-secondary);
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}

.user {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-top: 26px;
}

.avatar {
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  background: var(--c-surface-2);
  background-size: cover;
  background-position: center;
  border: 1px solid var(--c-accent-dim);
  color: var(--c-text-muted);
  clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
  padding: 0;
}

.meta {
  flex: 1;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.login {
  font-size: 20px;
  font-weight: 800;
  font-style: italic;
  letter-spacing: 1px;
  color: var(--c-text);
  padding: 0;
}

.level {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: var(--c-accent-dim);
  color: var(--c-accent);
  font-size: 11px;
  font-weight: 700;
  clip-path: polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px);
}

.uid {
  margin-top: 6px;
  font-size: 12px;
  color: var(--c-text-muted);
}

.switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  color: var(--c-text);
  font-size: 14px;
  font-weight: 600;
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}
</style>
