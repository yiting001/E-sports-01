<script setup lang="ts">
/**
 * 我的页头部：切角头像框（已设头像展示图片）+ 登录入口/昵称 + 等级徽章 + 身份切换。
 * 已登录时点头像/设置进入个人信息编辑页（含退出登录）；未登录时点击「立即登录」跳登录页。
 * 拥有打手角色时可在「老板/打手」身份间切换（导航随之变化），
 * 未入驻时点切换引导去打手入驻。登录资料取自 auth.store，会员等级取自 member.store。
 */
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppIcon from '@/components/common/AppIcon.vue';
import { useToast } from '@/composables/use-toast';
import { useAuthStore } from '@/stores/auth.store';
import { useMemberStore } from '@/stores/member.store';
import { useRoleStore } from '@/stores/role.store';

const auth = useAuthStore();
const member = useMemberStore();
const role = useRoleStore();
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

/** 切换按钮文案：展示当前身份 */
const roleLabel = computed(() => (role.isBoosterMode ? '打手' : '老板'));

/** 身份切换：已入驻在老板/打手间切换，未入驻引导去打手入驻 */
function onSwitch(): void {
  if (!auth.isAuthenticated) {
    goLogin();
    return;
  }
  if (!role.hasBoosterRole) {
    toast.show('成为打手后可切换身份，先去入驻吧');
    void router.push({ name: 'booster-apply' });
    return;
  }
  const next = role.isBoosterMode ? 'user' : 'booster';
  role.switchRole(next);
  toast.show(next === 'booster' ? '已切换为打手身份' : '已切换为老板身份');
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
          <span
            v-if="auth.isAuthenticated && member.mine"
            class="level"
            data-testid="profile-member-level"
          >
            <AppIcon
              name="gem"
              :size="12"
            />
            Lv.{{ member.mine.level }}
          </span>
        </div>
        <p class="uid">
          {{ uidText }}
        </p>
      </div>
      <button
        class="switch"
        @click="onSwitch"
      >
        <AppIcon
          name="swap"
          :size="15"
        />
        {{ roleLabel }}
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
