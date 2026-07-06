<script setup lang="ts">
/**
 * 福利活动列表页（全屏）：展示进行中的运营活动，点击进入详情。
 * 仅启用且在起止时间内的活动可见。
 */
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { ActivityPublicView } from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import { activityApi } from '@/api/activity.api';
import { activityDateText } from './activity-format';

const router = useRouter();
const list = ref<ActivityPublicView[]>([]);
const loading = ref(true);

function open(item: ActivityPublicView): void {
  router.push({ name: 'activity-detail', params: { id: item.id } });
}

onMounted(async () => {
  try {
    list.value = await activityApi.list();
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="activity-page client-page">
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
        <span class="name">福利活动</span>
        <span class="tip">进行中的平台活动</span>
      </div>
    </header>

    <div class="scroll">
      <p
        v-if="loading"
        class="hint"
      >
        加载中…
      </p>
      <p
        v-else-if="!list.length"
        class="hint"
      >
        暂无进行中的活动
      </p>
      <button
        v-for="item in list"
        v-else
        :key="item.id"
        class="item card"
        @click="open(item)"
      >
        <div
          v-if="item.cover"
          class="cover"
          :style="{ backgroundImage: `url(${item.cover})` }"
        />
        <div class="item-body">
          <span class="item-title">{{ item.title }}</span>
          <span class="item-time">
            {{ activityDateText(item.startAt) }} ~ {{ activityDateText(item.endAt) }}
          </span>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.activity-page {
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

.hint {
  text-align: center;
  font-size: 13px;
  color: var(--c-text-secondary);
  padding: 24px 0;
}

.item {
  display: flex;
  flex-direction: column;
  text-align: left;
  overflow: hidden;
  cursor: pointer;
}

.cover {
  width: 100%;
  height: 140px;
  background-size: cover;
  background-position: center;
}

.item-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
}

.item-title {
  font-size: 15px;
  font-weight: 700;
}

.item-time {
  font-size: 12px;
  color: var(--c-text-secondary);
}
</style>
