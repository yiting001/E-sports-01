<script setup lang="ts">
/**
 * 余额与客服双卡：暗面金字余额卡（分转元、计分板字体）+ 战术金联系客服卡。
 * 联系客服卡进入在线客服聊天页。
 */
import { useRouter } from 'vue-router';
import { fenToYuan } from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import { useToast } from '@/composables/use-toast';

/** 余额（分）。UI 阶段未登录固定为 0，后续接钱包接口 */
const BALANCE_FEN = 0;

const toast = useToast();
const router = useRouter();
</script>

<template>
  <div class="cards">
    <button
      class="balance card"
      @click="toast.show('余额明细即将上线')"
    >
      <span class="label">我的余额 ›</span>
      <span class="amount">{{ fenToYuan(BALANCE_FEN) }}</span>
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
