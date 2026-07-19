<script setup lang="ts">
/**
 * 首页三个运营快捷入口：切角深色卡 + 金色图标与标语 + 下方说明文字。
 * 活动入口进入活动中心，投诉入口进入投诉反馈页，挑选打手进入登录态目录。
 */
import { useRouter } from 'vue-router';
import AppIcon from '@/components/common/AppIcon.vue';
import {
  ACTIVITY_ENTRY_ID,
  BOOSTER_DIRECTORY_ENTRY_ID,
  COMPLAINT_ENTRY_ID,
  QUICK_ENTRIES,
  type QuickEntry,
} from '@/config/home.mock';
const router = useRouter();

function openEntry(entry: QuickEntry): void {
  if (entry.id === ACTIVITY_ENTRY_ID) {
    router.push({ name: 'activities' });
    return;
  }

  if (entry.id === COMPLAINT_ENTRY_ID) {
    router.push({ name: 'feedback' });
    return;
  }
  if (entry.id === BOOSTER_DIRECTORY_ENTRY_ID) {
    router.push({ name: 'booster-list' });
  }
}
</script>

<template>
  <div class="entries">
    <button
      v-for="entry in QUICK_ENTRIES"
      :key="entry.id"
      class="entry"
      @click="openEntry(entry)"
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
