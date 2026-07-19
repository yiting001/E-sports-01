<script setup lang="ts">
/** 商品详情页的平台服务保障；文案按当前产品承诺集中维护。 */
import AppIcon from '@/components/common/AppIcon.vue';
import type { IconName } from '@/config/icon-paths';

const SERVICE_ASSURANCES = [
  { label: '极速接单', icon: 'crosshair' },
  { label: '极速响应', icon: 'reply' },
  { label: '服务至上', icon: 'shieldCheck' },
  { label: '官方严选', icon: 'shield' },
] satisfies ReadonlyArray<{ label: string; icon: IconName }>;
</script>

<template>
  <section
    class="assurance-bar card"
    aria-label="服务保障"
  >
    <div
      v-for="item in SERVICE_ASSURANCES"
      :key="item.label"
      class="assurance-item"
    >
      <AppIcon
        :name="item.icon"
        :size="15"
      />
      <span>{{ item.label }}</span>
    </div>
  </section>
</template>

<style scoped>
.assurance-bar {
  min-height: 58px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: stretch;
  padding: 10px 8px;
}

.assurance-item {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  color: var(--c-text-secondary);
  white-space: nowrap;
}

.assurance-item + .assurance-item {
  border-left: 1px solid var(--c-border);
}

.assurance-item :deep(svg) {
  flex-shrink: 0;
  color: var(--c-accent);
}

@media (max-width: 360px) {
  .assurance-item {
    flex-direction: column;
    gap: 3px;
    padding: 0 2px;
    font-size: 10px;
  }
}
</style>
