<script setup lang="ts">
/**
 * C 端客服聊天面板：封装客服会话解析、进房、历史消息、实时收发与媒体发送。
 * 可作为 /service 全屏聊天，也可嵌入 /messages 的 PC 双栏布局。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
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
import ChatMedia from '@/components/message/ChatMedia.vue';
import ChatMentionPicker from '@/components/message/ChatMentionPicker.vue';
import ChatReplyQuote from '@/components/message/ChatReplyQuote.vue';
import { useChatCompose } from '@/composables/use-chat-compose';
import { imApi } from '@/api/im.api';
import { uploadApi } from '@/api/upload.api';
import { createImSocket } from '@/composables/use-im-socket';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from '@/composables/use-toast';
import './ServiceChatPanel.css';

const props = withDefaults(
  defineProps<{
    /** 外部指定要打开的会话；为空时可由 autoStart 决定是否自动开启客服会话 */
    conversation?: ConversationView | null;
    /** 无指定会话时是否复用/新建客服会话 */
    autoStart?: boolean;
    /** 是否展示返回按钮 */
    showBack?: boolean;
    /** 嵌入模式：用于消息页 PC 右侧面板 */
    embedded?: boolean;
    /** 未选择会话时的提示文案 */
    emptyText?: string;
  }>(),
  {
    conversation: null,
    autoStart: true,
    showBack: true,
    embedded: false,
    emptyText: '选择会话查看对话',
  },
);

const emit = defineEmits<{
  back: [];
  ready: [conversation: ConversationView];
  message: [message: ChatMessage];
}>();

const auth = useAuthStore();
const toast = useToast();
let socket = createImSocket();

const activeConversation = ref<ConversationView | null>(null);
const activeConversationId = ref('');
const messages = ref<ChatMessage[]>([]);
const draft = ref('');
const loading = ref(false);
const uploading = ref(false);
const scrollArea = ref<HTMLElement | null>(null);
const compose = useChatCompose(draft);
const imageInput = ref<HTMLInputElement | null>(null);
const videoInput = ref<HTMLInputElement | null>(null);

/** 会话状态文案：待接入 / 服务中 / 已结束 */
const statusText = computed(() => {
  if (!activeConversation.value) {
    return '等待选择会话';
  }
  if (activeConversation.value.type === ConversationType.Group) {
    return '群聊会话';
  }
  switch (activeConversation.value.status) {
    case ConversationStatus.Active:
      return '客服服务中';
    case ConversationStatus.Closed:
      return '会话已结束';
    default:
      return '正在为你接入客服…';
  }
});

/** 会话已结束或未选择会话时禁止继续发送 */
const canSend = computed(
  () =>
    Boolean(activeConversation.value) &&
    activeConversation.value?.status !== ConversationStatus.Closed,
);

const titleText = computed(() => activeConversation.value?.title || '三角洲客服');

function isSelf(message: ChatMessage): boolean {
  return message.senderId === auth.profile?.id;
}

function isSystem(message: ChatMessage): boolean {
  return message.senderId === SYSTEM_SENDER_ID;
}

/** 消息是否 @ 了当前用户，命中时气泡高亮 */
function mentionedMe(message: ChatMessage): boolean {
  const selfId = auth.profile?.id;
  return Boolean(selfId && message.mentions?.includes(selfId));
}

/** 引用预览里的发送者名：自己显「我」，其他人从成员清单解析 */
function senderNameOf(message: ChatMessage): string {
  if (isSelf(message)) {
    return '我';
  }
  const member = compose.members.value.find((m) => m.userId === message.senderId);
  if (member?.username) {
    return member.username;
  }
  return activeConversation.value?.type === ConversationType.Service ? '客服' : '对方';
}

/** 发送者业务身份标签（老板/客服/打手/管理员），无则空串不展示 */
function senderTagOf(message: ChatMessage): string {
  const member = compose.members.value.find((m) => m.userId === message.senderId);
  return member?.tag ?? '';
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
    (item) => item.type === ConversationType.Service && item.status !== ConversationStatus.Closed,
  );
  return ongoing ?? (await imApi.startService());
}

function resetSocket(): void {
  socket.disconnect();
  socket = createImSocket();
}

async function joinConversation(target: ConversationView | null): Promise<void> {
  if (!target) {
    socket.disconnect();
    activeConversationId.value = '';
    activeConversation.value = null;
    messages.value = [];
    loading.value = false;
    return;
  }
  if (target.id === activeConversationId.value) {
    activeConversation.value = target;
    loading.value = false;
    return;
  }

  loading.value = true;
  resetSocket();
  try {
    activeConversation.value = target;
    socket.connect();
    socket.onReceive(async (message) => {
      if (message.conversationId === activeConversation.value?.id) {
        messages.value.push(message);
        emit('message', message);
        await scrollToBottom();
      }
    });
    socket.onError((err) => toast.show(err.message));
    messages.value = await socket.join(target.id);
    activeConversationId.value = target.id;
    void loadMembers(target.id);
    emit('ready', target);
    await scrollToBottom();
  } catch {
    toast.show('客服接入失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}

/** 拉取会话成员供 @选择（失败不阻断聊天，仅不可 @） */
async function loadMembers(conversationId: string): Promise<void> {
  try {
    const detail = await imApi.conversationDetail(conversationId);
    compose.setMembers(detail.members, auth.profile?.id);
  } catch {
    compose.setMembers([]);
  }
}

async function setupConversation(): Promise<void> {
  try {
    if (!auth.profile) {
      await auth.loadProfile();
    }
    const target = props.conversation ?? (props.autoStart ? await resolveConversation() : null);
    await joinConversation(target);
  } catch {
    loading.value = false;
    toast.show('客服接入失败，请稍后重试');
  }
}

function send(): void {
  const content = draft.value.trim();
  if (!content || !activeConversation.value || !canSend.value) {
    return;
  }
  socket.send({
    conversationId: activeConversation.value.id,
    type: MessageType.Text,
    content,
    mentions: compose.collectMentions(content),
    replyToId: compose.replyTarget.value?.id,
  });
  draft.value = '';
  compose.clearAfterSend();
}

/** 选中图片/视频后：自助上传拿 URL，再作为对应类型的消息发送 */
async function sendMedia(
  event: Event,
  type: MessageType.Image | MessageType.Video,
): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file || !activeConversation.value || !canSend.value) {
    return;
  }
  uploading.value = true;
  try {
    const { url } = await uploadApi.uploadSelf(file);
    socket.send({
      conversationId: activeConversation.value.id,
      type,
      content: url,
    });
  } finally {
    uploading.value = false;
  }
}

onMounted(() => {
  void setupConversation();
});

watch(
  () => [props.conversation?.id ?? '', props.autoStart] as const,
  () => {
    void setupConversation();
  },
);

onBeforeUnmount(() => socket.disconnect());
</script>

<template>
  <section
    class="chat-panel"
    :class="{
      'chat-panel--fullscreen': !embedded,
      'chat-panel--embedded': embedded,
    }"
  >
    <header class="bar">
      <div class="bar-inner">
        <button
          v-if="showBack"
          class="back"
          aria-label="返回"
          @click="emit('back')"
        >
          <AppIcon
            name="chevron"
            :size="20"
          />
        </button>
        <div class="bar-title">
          <span class="name">{{ titleText }}</span>
          <span class="status">{{ statusText }}</span>
        </div>
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
        v-else-if="!activeConversation"
        class="hint"
      >
        {{ emptyText }}
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
          <div class="col">
            <span class="sender">
              {{ senderNameOf(msg) }}
              <span
                v-if="senderTagOf(msg)"
                class="sender-tag"
              >{{ senderTagOf(msg) }}</span>
            </span>
            <div
              class="bubble"
              :class="{ 'bubble--mention': mentionedMe(msg) }"
            >
              <ChatReplyQuote
                v-if="msg.replyTo"
                :sender-name="msg.replyTo.senderName"
                :type="msg.replyTo.type"
                :content="msg.replyTo.content"
              />
              <p
                v-if="msg.type === MessageType.Text"
                class="text"
              >
                {{ msg.content }}
              </p>
              <ChatMedia
                v-else-if="msg.type === MessageType.Image"
                type="image"
                :url="msg.content"
              />
              <ChatMedia
                v-else-if="msg.type === MessageType.Video"
                type="video"
                :url="msg.content"
              />
              <span class="time">{{ formatTime(msg.createdAt) }}</span>
            </div>
          </div>
          <button
            v-if="canSend"
            class="quote-btn"
            aria-label="引用回复"
            @click="compose.setReply(msg)"
          >
            <AppIcon
              name="reply"
              :size="14"
            />
          </button>
        </div>
      </template>
    </div>

    <div
      v-if="compose.mentionQuery.value !== null"
      class="compose-float"
    >
      <ChatMentionPicker
        :candidates="compose.mentionCandidates.value"
        @pick="compose.pickMention"
      />
    </div>
    <div
      v-if="compose.replyTarget.value"
      class="compose-float"
    >
      <ChatReplyQuote
        :sender-name="senderNameOf(compose.replyTarget.value)"
        :type="compose.replyTarget.value.type"
        :content="compose.replyTarget.value.content"
        cancellable
        @cancel="compose.clearAfterSend()"
      />
    </div>

    <footer class="compose">
      <input
        ref="imageInput"
        class="file-input"
        type="file"
        accept="image/*"
        @change="sendMedia($event, MessageType.Image)"
      >
      <input
        ref="videoInput"
        class="file-input"
        type="file"
        accept="video/*"
        @change="sendMedia($event, MessageType.Video)"
      >
      <button
        class="tool"
        aria-label="发送图片"
        :disabled="!canSend || uploading"
        @click="imageInput?.click()"
      >
        <AppIcon
          name="image"
          :size="20"
        />
      </button>
      <button
        class="tool"
        aria-label="发送视频"
        :disabled="!canSend || uploading"
        @click="videoInput?.click()"
      >
        <AppIcon
          name="video"
          :size="20"
        />
      </button>
      <input
        v-model="draft"
        class="input"
        type="text"
        :disabled="!canSend"
        :placeholder="canSend ? (uploading ? '发送中…' : '输入消息…') : '会话不可发送'"
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
  </section>
</template>
