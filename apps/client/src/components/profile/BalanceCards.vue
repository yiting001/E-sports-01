<script setup lang="ts">
/**
 * 余额与客服双卡：暗面金字余额卡（真实钱包余额，点击进钱包页）+ 战术金联系客服卡。
 * 联系客服卡进入在线客服聊天页。
 */
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppIcon from '@/components/common/AppIcon.vue';
import { walletApi } from '@/api/wallet.api';

const router = useRouter();

/** 钱包余额（元展示串）；拉取失败静默按 0 展示，不阻断个人中心渲染 */
const balanceYuan = ref('0.00');

onMounted(async () => {
  try {
    balanceYuan.value = (await walletApi.mine()).balanceYuan;
  } catch {
    // 静默回退
  }
});
</script>

<template>
  <div class="cards">
    <button
      class="balance card"
      @click="router.push({ name: 'wallet' })"
    >
      <span class="label">我的余额 ›</span>
      <span class="amount">{{ balanceYuan }}</span>
    </button>
    <button
      class="service"
      @click="router.push({ name: 'service' })"
    >
      <span class="badge">实时在线</span>
      <span class="text">
        <AppIcon
          name="headset"
          :size="18"
        />
        联系客服
      </span>
    </button>
  </div>
</template>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.balance,
.service {
  min-height: 96px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  text-align: left;
}

.balance .label {
  font-size: 13px;
  color: var(--c-text-secondary);
}

.balance .amount {
  font-family: var(--font-num);
  font-size: 30px;
  font-weight: 800;
  color: var(--c-accent);
  text-shadow: 0 0 16px rgba(255, 176, 32, 0.35);
}

.service {
  background: linear-gradient(135deg, #ffc94d 0%, var(--c-accent) 100%);
  color: var(--c-bg);
  clip-path: polygon(
    var(--chamfer) 0,
    100% 0,
    100% calc(100% - var(--chamfer)),
    calc(100% - var(--chamfer)) 100%,
    0 100%,
    0 var(--chamfer)
  );
}

.service .badge {
  padding: 3px 8px;
  background: rgba(11, 14, 20, 0.85);
  color: var(--c-accent);
  font-size: 11px;
  font-weight: 600;
  clip-path: polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px);
}

.service .text {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 800;
  font-style: italic;
}
</style>
