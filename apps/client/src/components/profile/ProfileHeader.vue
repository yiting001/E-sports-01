<script setup lang="ts">
/**
 * 我的页头部：切角头像框 + 登录入口 + 等级徽章 + 老板/打手身份切换 + 设置按钮。
 */
import AppIcon from '@/components/common/AppIcon.vue';
import { useToast } from '@/composables/use-toast';

const toast = useToast();
</script>

<template>
  <div class="header">
    <button
      class="settings"
      @click="toast.show('设置页即将上线')"
    >
      <AppIcon
        name="settings"
        :size="18"
      />
    </button>
    <div class="user">
      <div class="avatar">
        <AppIcon
          name="user"
          :size="34"
        />
      </div>
      <div class="meta">
        <div class="name-row">
          <button
            class="login"
            @click="toast.show('登录功能即将上线')"
          >
            立即登录
          </button>
          <span class="level">
            <AppIcon
              name="gem"
              :size="12"
            />
            Lv.1
          </span>
        </div>
        <p class="uid">
          用户ID: 未登陆
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
  border: 1px solid var(--c-accent-dim);
  color: var(--c-text-muted);
  clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
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
