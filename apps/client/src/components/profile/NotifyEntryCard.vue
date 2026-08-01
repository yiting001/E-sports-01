<script setup lang="ts">
/**
 * 我的页 · 通知设置入口卡（打手身份展示）。
 * 打手是订单微信通知的主要受众，打手身份下没有「更多功能」网格，
 * 因此单独提供绑定入口；购物身份从更多功能网格进入同一页面。
 */
import { useRouter } from 'vue-router';
import AppIcon from '@/components/common/AppIcon.vue';

const router = useRouter();
</script>

<template>
  <button
    class="notify-entry card"
    @click="router.push({ name: 'notify-settings' })"
  >
    <span class="icon-box">
      <AppIcon
        name="bell"
        :size="20"
      />
    </span>
    <span class="text">
      <strong>通知设置</strong>
      <small>绑定微信后接单大厅新订单将推送到微信</small>
    </span>
    <AppIcon
      name="chevron"
      :size="18"
      class="chevron"
    />
  </button>
</template>

<style scoped>
.notify-entry {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
  width: 100%;
  text-align: left;
}

.icon-box {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--c-accent-dim);
  color: var(--c-accent);
  flex-shrink: 0;
}

.text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.text strong {
  font-size: 14px;
}

.text small {
  font-size: 12px;
  color: var(--c-text-muted);
}

.chevron {
  color: var(--c-text-muted);
  flex-shrink: 0;
}
</style>
