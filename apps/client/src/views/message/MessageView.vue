<script setup lang="ts">
/**
 * 消息页：移动端展示 IM 会话列表；PC 端左侧会话列表、右侧嵌入聊天面板。
 * 会话实时收发复用 ServiceChatPanel，列表只负责会话摘要、选中态与移动端跳转。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { MessageType, type ChatMessage, type ConversationView } from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import ServiceChatPanel from '@/components/message/ServiceChatPanel.vue';
import { imApi } from '@/api/im.api';
import { useUnreadStore } from '@/stores/unread.store';

const MESSAGE_TITLE = '会话消息';
const router = useRouter();

const unreadStore = useUnreadStore();
const conversations = ref<ConversationView[]>([]);
const selectedConversation = ref<ConversationView | null>(null);
const loading = ref(true);
let desktopQuery: MediaQueryList | null = null;

const selectedConversationId = computed(() => selectedConversation.value?.id ?? '');

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

/** 本地列表可能滞后于全局事件，始终刷新服务端权威未读数。 */
function refreshUnreadBadge(): void {
  void unreadStore.refresh();
}

function isDesktopLayout(): boolean {
  return window.matchMedia('(min-width: 768px)').matches;
}

function selectDefaultConversation(): void {
  if (!isDesktopLayout() || selectedConversation.value || conversations.value.length === 0) {
    return;
  }
  selectedConversation.value = conversations.value[0];
}

function onViewportChange(event: MediaQueryListEvent): void {
  if (event.matches) {
    selectDefaultConversation();
  }
}

/** 点击会话：移动端进入该会话的全屏聊天，PC 端在右侧打开 */
function openConversation(conv: ConversationView): void {
  if (isDesktopLayout()) {
    const index = conversations.value.findIndex((item) => item.id === conv.id);
    const next = { ...conv, unread: 0 };
    if (index >= 0) {
      conversations.value.splice(index, 1, next);
    }
    selectedConversation.value = next;
    refreshUnreadBadge();
    return;
  }
  router.push({ name: 'chat', params: { id: conv.id } });
}

function upsertConversation(conv: ConversationView): void {
  const index = conversations.value.findIndex((item) => item.id === conv.id);
  const next = { ...conv, unread: 0 };
  if (index >= 0) {
    conversations.value.splice(index, 1, next);
  } else {
    conversations.value.unshift(next);
  }
  selectedConversation.value = next;
  refreshUnreadBadge();
}

function onChatMessage(message: ChatMessage): void {
  const index = conversations.value.findIndex((item) => item.id === message.conversationId);
  if (index < 0) {
    return;
  }
  const current = conversations.value[index];
  const isSelected = current.id === selectedConversationId.value;
  const next = {
    ...current,
    lastMessage: message,
    unread: isSelected ? 0 : current.unread + 1,
    updatedAt: message.createdAt,
  };
  conversations.value.splice(index, 1, next);
  if (isSelected) {
    selectedConversation.value = next;
  }
  refreshUnreadBadge();
}

onMounted(async () => {
  desktopQuery = window.matchMedia('(min-width: 768px)');
  desktopQuery.addEventListener('change', onViewportChange);
  try {
    conversations.value = await imApi.listConversations();
    selectDefaultConversation();
    refreshUnreadBadge();
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  desktopQuery?.removeEventListener('change', onViewportChange);
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
          :class="{ 'entry--active': conv.id === selectedConversationId }"
          @click="openConversation(conv)"
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

    <ServiceChatPanel
      class="desktop-chat"
      :conversation="selectedConversation"
      :auto-start="false"
      :embedded="true"
      :show-back="false"
      empty-text="选择左侧会话查看对话"
      @ready="upsertConversation"
      @message="onChatMessage"
    />
  </div>
</template>

<style scoped>
.message {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel {
  min-width: 0;
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

.entry--active {
  background: color-mix(in srgb, var(--c-accent-dim) 60%, transparent);
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

.desktop-chat {
  display: none;
}

@media (min-width: 768px) {
  .message {
    max-width: var(--page-max-width);
    margin: 0 auto;
    width: 100%;
    min-height: 560px;
    height: calc(100vh - 132px);
    display: grid;
    grid-template-columns: 320px minmax(0, 1fr);
    align-items: stretch;
    gap: 16px;
  }

  .panel {
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .panel-title {
    flex-shrink: 0;
  }

  .list,
  .empty {
    flex: 1;
    min-height: 0;
  }

  .list {
    overflow-y: auto;
  }

  .entry {
    padding: 16px;
  }

  .desktop-chat {
    min-width: 0;
    min-height: 0;
    display: flex;
  }

  .empty {
    min-height: 180px;
  }
}
</style>
