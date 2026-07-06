<script setup lang="ts">
/**
 * 搭建同款电竞系统介绍页（全屏）：平台能力介绍 + 咨询入口。
 * 咨询走站内在线客服（复用 IM 客服会话），不落联系方式硬编码。
 */
import { useRouter } from 'vue-router';
import AppIcon from '@/components/common/AppIcon.vue';

const router = useRouter();

/** 平台能力清单（介绍文案） */
const FEATURES = [
  { icon: 'gamepad', title: '接单派单', desc: '下单支付、客服派单、接单大厅、打手结算全流程' },
  { icon: 'card', title: '支付钱包', desc: '支付宝/微信扫码收款、余额钱包、提现审核' },
  { icon: 'crown', title: '会员成长', desc: '会员等级折扣、打手等级提成、排行榜' },
  { icon: 'ticket', title: '运营工具', desc: '优惠券、福利活动、公告通知、数据统计仪表盘' },
] as const;
</script>

<template>
  <div class="build-page client-page">
    <header class="bar">
      <button
        class="back"
        aria-label="返回"
        @click="router.back()"
      >
        <AppIcon
          name="chevron"
          :size="20"
        />
      </button>
      <div class="bar-title">
        <span class="name">搭建同款电竞系统</span>
        <span class="tip">一站式电竞陪玩代练平台解决方案</span>
      </div>
    </header>

    <div class="scroll">
      <section
        v-for="item in FEATURES"
        :key="item.title"
        class="card feature"
      >
        <span class="icon-box">
          <AppIcon
            :name="item.icon"
            :size="20"
          />
        </span>
        <div class="feature-body">
          <span class="feature-title">{{ item.title }}</span>
          <span class="feature-desc">{{ item.desc }}</span>
        </div>
      </section>

      <button
        class="consult"
        @click="router.push({ name: 'service' })"
      >
        联系在线客服咨询
      </button>
    </div>
  </div>
</template>

<style scoped>
.build-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(70% 36% at 50% 0%, rgba(255, 176, 32, 0.07), transparent 70%),
    var(--c-bg);
}

.bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-surface);
}

.back {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  color: var(--c-text);
  transform: rotate(180deg);
}

.bar-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.name {
  font-size: 16px;
  font-weight: 800;
  font-style: italic;
}

.tip {
  font-size: 12px;
  color: var(--c-accent);
}

.scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feature {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
}

.icon-box {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  color: var(--c-accent);
  background: var(--c-accent-dim);
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}

.feature-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.feature-title {
  font-size: 14px;
  font-weight: 700;
}

.feature-desc {
  font-size: 12px;
  color: var(--c-text-secondary);
}

.consult {
  margin-top: 8px;
  padding: 13px 0;
  font-size: 15px;
  font-weight: 800;
  color: #1a1206;
  background: var(--c-accent);
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}
</style>
