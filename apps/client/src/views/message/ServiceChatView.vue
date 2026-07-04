<script setup lang="ts">
/**
 * 在线客服聊天页（全屏）。
 * 复用后端 IM 客服能力：进入时复用进行中的客服会话或新发起，经 WebSocket 拉历史并实时收发。
 * 用户端仅需文字咨询；系统消息（客服接入/欢迎语，富文本）经 DOMPurify 净化后渲染。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  ConversationStatus,
  ConversationType,
  MessageType,
  SYSTEM_SENDER_ID,
  type ChatMessage,
  type ConversationView,
} from '@app/contracts';
import DOMPurify from 'dompurify';
import AppIcon from '@/components/common/AppIcon.vue';
import { imApi } from '@/api/im.api';
import { createImSocket } from '@/composables/use-im-socket';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from '@/composables/use-toast';

const router = useRouter();
const auth = useAuthStore();
const toast = useToast();
const socket = createImSocket();

const conversation = ref<ConversationView | null>(null);
const messages = ref<ChatMessage[]>([]);
const draft = ref('');
const loading = ref(true);
const scrollArea = ref<HTMLElement | null>(null);

/** 会话状态文案：待接入 / 服务中 / 已结束 */
const statusText = computed(() => {
  switch (conversation.value?.status) {
    case ConversationStatus.Active:
      return '客服服务中';
    case ConversationStatus.Closed:
      return '会话已结束';
    default:
      return '正在为你接入客服…';
  }
});

/** 会话已结束后禁止继续发送 */
const canSend = computed(
  () =>
    Boolean(conversation.value) &&
    conversation.value?.status !== ConversationStatus.Closed,
);

function isSelf(message: ChatMessage): boolean {
  return message.senderId === auth.profile?.id;
}

function isSystem(message: ChatMessage): boolean {
  return message.senderId === SYSTEM_SENDER_ID;
}

/** 系统富文本消息净化后渲染，防止 XSS */
function safeHtml(content: string): string {
  return DOMPurify.sanitize(content);
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function scrollToBottom(): Promise<void> {
  await nextTick();
  const el = scrollArea.value;
  if (el) {
    el.scrollTop = el.scrollHeight;
  }
}

/** 复用进行中的客服会话，否则新发起一个 */
async function resolveConversation(): Promise<ConversationView> {
  const list = await imApi.listConversations();
  const ongoing = list.find(
    (c) => c.type === ConversationType.Service && c.status !== ConversationStatus.Closed,
  );
  return ongoing ?? (await imApi.startService());
}

function send(): void {
  const content = draft.value.trim();
  if (!content || !conversation.value || !canSend.value) {
    return;
  }
  socket.send({
    conversationId: conversation.value.id,
    type: MessageType.Text,
    content,
  });
  draft.value = '';
}

function goBack(): void {
  router.back();
}

onMounted(async () => {
  try {
    const conv = await resolveConversation();
    conversation.value = conv;
    socket.connect();
    socket.onReceive(async (message) => {
      if (message.conversationId === conversation.value?.id) {
        messages.value.push(message);
        await scrollToBottom();
      }
    });
    socket.onError((err) => toast.show(err.message));
    messages.value = await socket.join(conv.id);
    await scrollToBottom();
  } catch {
    toast.show('客服接入失败，请稍后重试');
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => socket.disconnect());
</script>

<template>
  <div class="service">
    <header class="bar">
      <button
        class="back"
        aria-label="返回"
        @click="goBack"
      >
        <AppIcon
          name="chevron"
          :size="20"
        />
      </button>
      <div class="bar-title">
        <span class="name">三角洲客服</span>
        <span class="status">{{ statusText }}</span>
      </div>
    </header>

    <div
      ref="scrollArea"
      class="scroll"
    >
      <p
        v-if="loading"
        class="hint"
      >
        接入中…
      </p>
      <p
        v-else-if="!messages.length"
        class="hint"
      >
        发送消息开始咨询，客服会尽快接入
      </p>

      <template
        v-for="msg in messages"
        :key="msg.id"
      >
        <div
          v-if="isSystem(msg)"
          class="sys"
        >
          <!-- eslint-disable vue/no-v-html -->
          <span
            class="sys-body"
            v-html="safeHtml(msg.content)"
          />
          <!-- eslint-enable vue/no-v-html -->
        </div>
        <div
          v-else
          class="row"
          :class="{ 'row--self': isSelf(msg) }"
        >
          <div class="bubble">
            <p
              v-if="msg.type === MessageType.Text"
              class="text"
            >
              {{ msg.content }}
            </p>
            <img
              v-else-if="msg.type === MessageType.Image"
              :src="msg.content"
              class="media"
              alt="图片消息"
            >
            <video
              v-else-if="msg.type === MessageType.Video"
              :src="msg.content"
              class="media"
              controls
            />
            <span class="time">{{ formatTime(msg.createdAt) }}</span>
          </div>
        </div>
      </template>
    </div>

    <footer class="compose card">
      <input
        v-model="draft"
        class="input"
        type="text"
        :disabled="!canSend"
        :placeholder="canSend ? '输入消息…' : '会话已结束'"
        @keyup.enter="send"
      >
      <button
        class="send"
        :disabled="!canSend || !draft.trim()"
        @click="send"
      >
        发送
      </button>
    </footer>
  </div>
</template>

<style scoped>
.service {
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

.status {
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
  color: var(--c-text-muted);
  padding: 8px 0;
}

.sys {
  text-align: center;
}

.sys-body {
  display: inline-block;
  max-width: 80%;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--c-text-secondary);
  background: var(--c-surface-2);
  border-radius: var(--radius-sm);
}

.sys-body :deep(img),
.sys-body :deep(video) {
  max-width: 100%;
  border-radius: var(--radius-sm);
}

.row {
  display: flex;
  justify-content: flex-start;
}

.row--self {
  justify-content: flex-end;
}

.bubble {
  max-width: 76%;
  padding: 10px 12px;
  background: var(--c-surface-2);
  border: 1px solid var(--c-border);
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}

.row--self .bubble {
  background: var(--c-accent-dim);
  border-color: rgba(255, 176, 32, 0.4);
}

.text {
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
}

.media {
  display: block;
  max-width: 100%;
  border-radius: var(--radius-sm);
}

.time {
  display: block;
  margin-top: 4px;
  font-size: 10px;
  color: var(--c-text-muted);
  text-align: right;
}

.compose {
  flex-shrink: 0;
  display: flex;
  gap: 10px;
  align-items: center;
  margin: 12px;
  padding: 10px 12px;
}

.input {
  flex: 1;
  min-width: 0;
  height: 40px;
  padding: 0 12px;
  color: var(--c-text);
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  font-size: 14px;
}

.input:disabled {
  opacity: 0.6;
}

.send {
  flex-shrink: 0;
  height: 40px;
  padding: 0 18px;
  font-weight: 700;
  color: #0b0e14;
  background: var(--c-accent);
  border-radius: var(--radius-sm);
}

.send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
