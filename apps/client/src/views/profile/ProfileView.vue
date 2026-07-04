<script setup lang="ts">
/**
 * 我的页：头部（登录/身份切换）→ 订单入口 → 余额/客服双卡 → 更多功能 → 版本号。
 * 各区块拆为独立组件，本视图只做纵向编排。
 */
import BalanceCards from '@/components/profile/BalanceCards.vue';
import FeatureGrid from '@/components/profile/FeatureGrid.vue';
import OrderEntries from '@/components/profile/OrderEntries.vue';
import ProfileHeader from '@/components/profile/ProfileHeader.vue';
import { APP_VERSION_TEXT } from '@/config/profile.mock';
</script>

<template>
  <div class="profile">
    <ProfileHeader />
    <OrderEntries />
    <BalanceCards />
    <FeatureGrid />
    <p class="version">
      {{ APP_VERSION_TEXT }}
    </p>
  </div>
</template>

<style scoped>
.profile {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.version {
  text-align: center;
  font-size: 12px;
  color: var(--c-text-muted);
  padding: 8px 0 4px;
}

/* PC 端限宽居中，保持移动端排版观感 */
@media (min-width: 768px) {
  .profile {
    max-width: 640px;
    margin: 0 auto;
    width: 100%;
  }
}
</style>
