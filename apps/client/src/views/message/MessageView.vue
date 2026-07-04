<script setup lang="ts">
/**
 * 消息页：顶部「官方消息 / 会话消息」分段页签。
 * 官方消息为固定入口列表；会话消息接入 IM 会话列表（含最近消息摘要与未读数），
 * 点击会话进入在线客服聊天页。
 */
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { MessageType, type ChatMessage, type ConversationView } from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import SegmentTabs from '@/components/common/SegmentTabs.vue';
import { imApi } from '@/api/im.api';
import {
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

const conversations = ref<ConversationView[]>([]);
const loading = ref(true);

/** 最近一条消息摘要：图片/视频以占位文案展示 */
function lastMessageText(message: ChatMessage | null): string {
  if (!message) {
    return '暂无消息';
  }
  switch (message.type) {
    case MessageType.Image:
      return '[图片]';
    case MessageType.Video:
      return '[视频]';
    default:
      return message.content;
  }
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 点击消息入口：客服入口进入在线客服聊天，其余暂为占位提示 */
function openEntry(entry: MessageEntry): void {
  if (entry.id === SERVICE_ENTRY_ID) {
    router.push({ name: 'service' });
    return;
  }
  toast.show(`「${entry.title}」会话即将上线`);
}

/** 点击会话：C 端会话均为客服会话，进入在线客服聊天页 */
function openConversation(): void {
  router.push({ name: 'service' });
}

onMounted(async () => {
  try {
    conversations.value = await imApi.listConversations();
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="message">
    <SegmentTabs
      v-model="activeTab"
      :tabs="TABS"
      class="mobile-tabs"
    />

    <section
      class="panel panel--official"
      :class="{ 'panel--active': activeTab === 0 }"
    >
      <h2 class="panel-title sec-title">
        {{ TABS[0] }}
      </h2>
      <div class="list card">
        <button
          v-for="entry in OFFICIAL_MESSAGES"
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
    </section>

    <section
      class="panel panel--conversation"
      :class="{ 'panel--active': activeTab === 1 }"
    >
      <h2 class="panel-title sec-title">
        {{ TABS[1] }}
      </h2>
      <div
        v-if="conversations.length"
        class="list card"
      >
        <button
          v-for="conv in conversations"
          :key="conv.id"
          class="entry"
          @click="openConversation()"
        >
          <span class="avatar">
            <AppIcon
              name="headset"
              :size="20"
            />
          </span>
          <span class="body">
            <span class="title">{{ conv.title || '在线客服' }}</span>
            <span class="subtitle">{{ lastMessageText(conv.lastMessage) }}</span>
          </span>
          <span class="meta">
            <span
              v-if="conv.lastMessage"
              class="time"
            >{{ formatTime(conv.lastMessage.createdAt) }}</span>
            <span
              v-if="conv.unread"
              class="unread"
            >{{ conv.unread }}</span>
          </span>
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
        <p>{{ loading ? '加载中…' : '暂无会话消息' }}</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.message {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel {
  display: none;
}

.panel--active {
  display: block;
}

.panel-title {
  display: none;
  margin-bottom: 12px;
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

.meta {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.time {
  font-size: 11px;
  color: var(--c-text-muted);
}

.unread {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--c-bg);
  background: var(--c-accent);
  border-radius: 9px;
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

@media (min-width: 768px) {
  .message {
    display: grid;
    grid-template-columns: minmax(0, 360px) minmax(0, 1fr);
    align-items: start;
    gap: 16px;
  }

  .mobile-tabs {
    display: none;
  }

  .panel,
  .panel--active {
    display: block;
    min-width: 0;
  }

  .panel-title {
    display: flex;
  }

  .list,
  .empty {
    min-height: 180px;
  }
}
</style>
