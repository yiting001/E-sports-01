<script setup lang="ts">
/**
 * 我的页：头部（登录/身份切换）→ 订单入口 → 余额/客服双卡 → 更多功能 → 版本号。
 * 各区块拆为独立组件，本视图只做纵向编排。
 * 打手身份下只保留头部、等级/押金卡与余额/客服卡；购物身份展示会员等级卡。
 */
import BalanceCards from '@/components/profile/BalanceCards.vue';
import BoosterLevelCard from '@/components/profile/BoosterLevelCard.vue';
import MemberLevelCard from '@/components/profile/MemberLevelCard.vue';
import FeatureGrid from '@/components/profile/FeatureGrid.vue';
import OrderEntries from '@/components/profile/OrderEntries.vue';
import ProfileHeader from '@/components/profile/ProfileHeader.vue';
import { APP_VERSION_TEXT } from '@/config/profile.mock';
import { useMemberStore } from '@/stores/member.store';
import { useRoleStore } from '@/stores/role.store';

const member = useMemberStore();
const role = useRoleStore();

void member.refresh();
</script>

<template>
  <div class="profile">
    <ProfileHeader />
    <OrderEntries v-if="!role.isBoosterMode" />
    <BoosterLevelCard v-if="role.isBoosterMode" />
    <MemberLevelCard v-if="!role.isBoosterMode" />
    <BalanceCards />
    <FeatureGrid v-if="!role.isBoosterMode" />
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

@media (min-width: 768px) {
  .profile {
    max-width: 640px;
    margin: 0 auto;
    width: 100%;
  }
}

@media (min-width: 1024px) {
  .profile {
    max-width: var(--page-max-width);
    display: grid;
    grid-template-columns: 380px minmax(0, 1fr);
    grid-template-rows: auto auto auto;
    align-items: start;
  }

  .profile > :deep(.header),
  .profile > :deep(.member-card),
  .profile > :deep(.booster-card),
  .profile > :deep(.cards) {
    grid-column: 1;
  }

  .profile > :deep(.orders),
  .profile > :deep(.features) {
    grid-column: 2;
  }

  .profile > :deep(.orders) {
    grid-row: 1;
  }

  .profile > :deep(.member-card),
  .profile > :deep(.booster-card) {
    grid-row: 2;
  }

  .profile > :deep(.cards) {
    grid-row: 3;
  }

  .profile > :deep(.features) {
    grid-row: 2 / span 2;
  }

  .version {
    grid-column: 1 / -1;
  }
}
</style>
