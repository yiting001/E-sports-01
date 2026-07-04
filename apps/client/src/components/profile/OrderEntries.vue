<script setup lang="ts">
/**
 * 我的订单卡：切角金色角标 + 五个订单状态入口 + 「全部」跳转。
 */
import AppIcon from '@/components/common/AppIcon.vue';
import { ORDER_ENTRIES } from '@/config/profile.mock';
import { useToast } from '@/composables/use-toast';

const toast = useToast();
</script>

<template>
  <div class="orders card">
    <span class="ribbon">我的订单</span>
    <button
      class="all"
      @click="toast.show('全部订单即将上线')"
    >
      全部 ›
    </button>
    <div class="grid">
      <button
        v-for="entry in ORDER_ENTRIES"
        :key="entry.id"
        class="entry"
        @click="toast.show(`「${entry.label}」订单列表即将上线`)"
      >
        <AppIcon
          :name="entry.icon"
          :size="22"
          class="icon"
        />
        <span class="label">{{ entry.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.orders {
  position: relative;
  padding: 34px 8px 14px;
}

.ribbon {
  position: absolute;
  top: 0;
  left: 0;
  padding: 5px 14px;
  background: var(--c-accent);
  color: var(--c-bg);
  font-size: 12px;
  font-weight: 800;
  font-style: italic;
  clip-path: polygon(0 0, 100% 0, calc(100% - 10px) 100%, 0 100%);
}

.all {
  position: absolute;
  top: 8px;
  right: 14px;
  font-size: 12px;
  color: var(--c-text-muted);
}

.grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
}

.entry {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
}

.entry .icon {
  color: var(--c-accent);
}

.label {
  font-size: 12px;
  color: var(--c-text-secondary);
}
</style>
