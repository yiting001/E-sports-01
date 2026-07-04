<script setup lang="ts">
/**
 * 消息页：顶部「官方消息 / 会话消息」分段页签 + 消息入口列表。
 * 会话消息 UI 阶段为空态，后续接入 IM 模块的会话列表。
 */
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppIcon from '@/components/common/AppIcon.vue';
import SegmentTabs from '@/components/common/SegmentTabs.vue';
import {
  CHAT_MESSAGES,
  OFFICIAL_MESSAGES,
  SERVICE_ENTRY_ID,
  type MessageEntry,
} from '@/config/message.mock';
import { useToast } from '@/composables/use-toast';

/** 页签文案（下标与 activeTab 对应） */
const TABS = ['官方消息', '会话消息'];
const activeTab = ref(0);
const toast = useToast();
const router = useRouter();

/** 当前页签下的消息列表 */
const messages = computed(() => (activeTab.value === 0 ? OFFICIAL_MESSAGES : CHAT_MESSAGES));

/** 点击消息入口：客服入口进入在线客服聊天，其余暂为占位提示 */
function openEntry(entry: MessageEntry): void {
  if (entry.id === SERVICE_ENTRY_ID) {
    router.push({ name: 'service' });
    return;
  }
  toast.show(`「${entry.title}」会话即将上线`);
}
</script>

<template>
  <div class="message">
    <SegmentTabs
      v-model="activeTab"
      :tabs="TABS"
    />

    <div
      v-if="messages.length"
      class="list card"
    >
      <button
        v-for="entry in messages"
        :key="entry.id"
        class="entry"
        @click="openEntry(entry)"
      >
        <span class="avatar">
          <AppIcon
            :name="entry.icon"
            :size="20"
          />
        </span>
        <span class="body">
          <span class="title">{{ entry.title }}</span>
          <span class="subtitle">{{ entry.subtitle }}</span>
        </span>
        <span
          v-if="entry.action"
          class="action"
        >{{ entry.action }}</span>
      </button>
    </div>

    <div
      v-else
      class="empty card"
    >
      <AppIcon
        name="chat"
        :size="36"
        class="empty-icon"
      />
      <p>暂无会话消息</p>
    </div>
  </div>
</template>

<style scoped>
.message {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list {
  padding: 6px 0;
}

.entry {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  text-align: left;
}

.entry + .entry {
  border-top: 1px solid var(--c-border);
}

.avatar {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  color: var(--c-accent);
  background: var(--c-accent-dim);
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}

.body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.title {
  font-size: 15px;
  font-weight: 700;
}

.subtitle {
  font-size: 12px;
  color: var(--c-text-muted);
}

.action {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--c-accent);
}

.empty {
  padding: 64px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--c-text-muted);
  font-size: 13px;
}

.empty-icon {
  opacity: 0.5;
}
</style>
