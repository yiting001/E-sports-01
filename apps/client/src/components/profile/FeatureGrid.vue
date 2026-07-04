<script setup lang="ts">
/**
 * 更多功能网格：4 列图标入口（领券中心/会员等级/打手入驻等），金色线性图标。
 */
import AppIcon from '@/components/common/AppIcon.vue';
import { FEATURE_ENTRIES } from '@/config/profile.mock';
import { useToast } from '@/composables/use-toast';

const toast = useToast();
</script>

<template>
  <div class="features card">
    <h2 class="sec-title">
      更多功能
    </h2>
    <div class="grid">
      <button
        v-for="entry in FEATURE_ENTRIES"
        :key="entry.id"
        class="entry"
        @click="toast.show(`「${entry.label}」即将上线`)"
      >
        <span class="icon-box">
          <AppIcon
            :name="entry.icon"
            :size="20"
          />
        </span>
        <span class="label">{{ entry.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.features {
  padding: 16px 12px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px 4px;
  padding-top: 14px;
}

.entry {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.icon-box {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  color: var(--c-accent);
  background: var(--c-accent-dim);
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
  transition: background 0.2s ease;
}

.entry:hover .icon-box {
  background: rgba(255, 176, 32, 0.25);
}

.label {
  font-size: 12px;
  color: var(--c-text-secondary);
  text-align: center;
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(8, 1fr);
  }
}
</style>
