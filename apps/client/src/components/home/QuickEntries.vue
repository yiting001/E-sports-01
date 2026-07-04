<script setup lang="ts">
/**
 * 首页三个运营快捷入口：切角深色卡 + 金色图标与标语 + 下方说明文字。
 */
import AppIcon from '@/components/common/AppIcon.vue';
import { QUICK_ENTRIES } from '@/config/home.mock';
import { useToast } from '@/composables/use-toast';

const toast = useToast();
</script>

<template>
  <div class="entries">
    <button
      v-for="entry in QUICK_ENTRIES"
      :key="entry.id"
      class="entry"
      @click="toast.show(`「${entry.label}」即将上线`)"
    >
      <div class="banner card">
        <AppIcon
          :name="entry.icon"
          :size="20"
        />
        <span class="text">{{ entry.banner }}</span>
      </div>
      <span class="label">{{ entry.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.entries {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.entry {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.banner {
  width: 100%;
  height: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: var(--c-accent);
  transition: border-color 0.2s ease;
}

.entry:hover .banner {
  border-color: var(--c-accent);
}

.text {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.label {
  font-size: 12px;
  color: var(--c-text-muted);
}
</style>
