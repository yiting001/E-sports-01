<script setup lang="ts">
/**
 * 消息页：展示 IM 会话列表（含最近消息摘要与未读数）。
 * 点击会话进入在线客服聊天页；页面只承载真实 IM 会话，不保留固定占位入口。
 */
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { MessageType, type ChatMessage, type ConversationView } from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import { imApi } from '@/api/im.api';

const MESSAGE_TITLE = '会话消息';
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
    <section class="panel">
      <h2 class="panel-title sec-title">
        {{ MESSAGE_TITLE }}
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

.panel-title {
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
    max-width: 760px;
    margin: 0 auto;
    width: 100%;
  }

  .empty {
    min-height: 180px;
  }
}
</style>
