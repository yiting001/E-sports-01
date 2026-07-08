<script setup lang="ts">
/**
 * 移动端底部导航条：切角深色面板，激活项战术金高亮 + 顶部指示线。
 * 导航项随当前身份切换：打手身份展示接单大厅/订单中心/消息/我的。
 * 「消息」Tab 展示未读消息红色数量角标。
 */
import { computed } from 'vue';
import AppIcon from '@/components/common/AppIcon.vue';
import { BOOSTER_NAV_ITEMS, MESSAGE_NAV_NAME, NAV_ITEMS } from '@/config/nav';
import { useRoleStore } from '@/stores/role.store';
import { useUnreadStore } from '@/stores/unread.store';

const role = useRoleStore();
const unread = useUnreadStore();
const items = computed(() => (role.isBoosterMode ? BOOSTER_NAV_ITEMS : NAV_ITEMS));

/** 角标文案：超过 99 显示 99+ */
const badgeText = computed(() => (unread.total > 99 ? '99+' : String(unread.total)));
</script>

<template>
  <nav class="tabbar">
    <router-link
      v-for="item in items"
      :key="item.name"
      :to="{ name: item.name }"
      class="tab"
      :class="{ active: $route.name === item.name }"
    >
      <span class="indicator" />
      <span class="icon-wrap">
        <AppIcon
          :name="item.icon"
          :size="21"
        />
        <span
          v-if="item.name === MESSAGE_NAV_NAME && unread.total > 0"
          class="badge"
        >{{ badgeText }}</span>
      </span>
      <span class="label">{{ item.label }}</span>
    </router-link>
  </nav>
</template>

<style scoped>
.tabbar {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: 10px;
  z-index: 100;
  height: var(--tabbar-height);
  display: flex;
  align-items: stretch;
  background: linear-gradient(180deg, rgba(26, 33, 48, 0.96), rgba(15, 19, 28, 0.96));
  border: 1px solid var(--c-border);
  backdrop-filter: blur(10px);
  clip-path: polygon(
    var(--chamfer) 0,
    100% 0,
    100% calc(100% - var(--chamfer)),
    calc(100% - var(--chamfer)) 100%,
    0 100%,
    0 var(--chamfer)
  );
}

.tab {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: var(--c-text-muted);
  transition: color 0.2s ease;
}

.indicator {
  position: absolute;
  top: 0;
  width: 26px;
  height: 2px;
  background: transparent;
  transition: background 0.2s ease;
}

.icon-wrap {
  position: relative;
  display: inline-flex;
}

.badge {
  position: absolute;
  top: -5px;
  left: calc(100% - 8px);
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  color: #fff;
  background: var(--c-danger);
  border-radius: 8px;
  white-space: nowrap;
}

.tab .label {
  font-size: 11px;
  letter-spacing: 1px;
}

.tab.active {
  color: var(--c-accent);
}

.tab.active .indicator {
  background: var(--c-accent);
  box-shadow: 0 0 8px var(--c-accent);
}
</style>
