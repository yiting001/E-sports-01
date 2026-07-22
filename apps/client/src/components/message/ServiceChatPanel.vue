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
  type ChatMessage,
  type ConversationView,
} from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import ChatConversationHeader from '@/components/message/ChatConversationHeader.vue';
import ChatMessageFeed from '@/components/message/ChatMessageFeed.vue';
import ChatMentionPicker from '@/components/message/ChatMentionPicker.vue';
import ChatReplyQuote from '@/components/message/ChatReplyQuote.vue';
import { useChatCompose } from '@/composables/use-chat-compose';
import { imApi } from '@/api/im.api';
import { uploadApi } from '@/api/upload.api';
import { createImSocket } from '@/composables/use-im-socket';
import { createVisibleMessageRead } from '@/composables/use-visible-message-read';
import { useAuthStore } from '@/stores/auth.store';
import { useUnreadStore } from '@/stores/unread.store';
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
const unread = useUnreadStore();
const toast = useToast();
let socket = createImSocket();
let setupRevision = 0;
let joinRevision = 0;
let joiningConversationId = '';
let disposed = false;

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
const visibleRead = createVisibleMessageRead({
  activeConversationId: () => activeConversation.value?.id ?? '',
  latestMessage: () => messages.value.at(-1),
  markRead: (conversationId, messageId) => socket.markRead(conversationId, messageId),
  onMarked: () => void unread.refresh(),
});

/** 会话已结束或未选择会话时禁止继续发送 */
const canSend = computed(
  () =>
    Boolean(activeConversation.value) &&
    activeConversation.value?.status !== ConversationStatus.Closed,
);

/** 引用预览里的发送者名：自己显「我」，其他人从成员清单解析 */
function senderNameOf(message: ChatMessage): string {
  if (message.senderId === auth.profile?.id) {
    return '我';
  }
  const member = compose.members.value.find((m) => m.userId === message.senderId);
  return member?.username ?? '对方';
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
    joinRevision += 1;
    joiningConversationId = '';
    socket.disconnect();
    activeConversationId.value = '';
    activeConversation.value = null;
    messages.value = [];
    loading.value = false;
    return;
  }
  if (
    target.id === activeConversationId.value ||
    target.id === joiningConversationId
  ) {
    const current = activeConversation.value;
    if (!current || target.version >= current.version) {
      activeConversation.value = target;
    }
    return;
  }

  const currentRevision = joinRevision + 1;
  joinRevision = currentRevision;
  joiningConversationId = target.id;
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
        await visibleRead.confirm(message);
      }
    });
    socket.onConversation((conversation) => {
      const current = activeConversation.value;
      if (
        conversation.id === current?.id &&
        conversation.version >= current.version
      ) {
        activeConversation.value = conversation;
        emit('ready', conversation);
      }
    });
    socket.onError((err) => toast.show(err.message));
    const history = await socket.join(target.id);
    if (currentRevision !== joinRevision) {
      return;
    }
    messages.value = history;
    activeConversationId.value = target.id;
    joiningConversationId = '';
    void unread.refresh();
    void loadMembers(target.id, currentRevision);
    emit('ready', activeConversation.value ?? target);
    await scrollToBottom();
    await visibleRead.confirm();
  } catch {
    if (currentRevision === joinRevision) {
      joiningConversationId = '';
      toast.show('客服接入失败，请稍后重试');
    }
  } finally {
    if (currentRevision === joinRevision) {
      loading.value = false;
    }
  }
}

/** 拉取会话成员供 @选择（失败不阻断聊天，仅不可 @） */
async function loadMembers(conversationId: string, revision: number): Promise<void> {
  try {
    const detail = await imApi.conversationDetail(conversationId);
    if (revision === joinRevision) {
      compose.setMembers(detail.members, auth.profile?.id);
    }
  } catch {
    if (revision === joinRevision) {
      compose.setMembers([]);
    }
  }
}

async function setupConversation(): Promise<void> {
  const currentSetupRevision = setupRevision + 1;
  setupRevision = currentSetupRevision;
  try {
    if (!auth.profile) {
      await auth.loadProfile();
    }
    const target = props.conversation ?? (props.autoStart ? await resolveConversation() : null);
    if (disposed || currentSetupRevision !== setupRevision) {
      return;
    }
    await joinConversation(target);
  } catch {
    if (!disposed && currentSetupRevision === setupRevision) {
      loading.value = false;
      toast.show('客服接入失败，请稍后重试');
    }
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
  visibleRead.start();
  void setupConversation();
});

watch(
  [() => props.conversation, () => props.autoStart],
  () => {
    void setupConversation();
  },
);

onBeforeUnmount(() => {
  disposed = true;
  setupRevision += 1;
  joinRevision += 1;
  joiningConversationId = '';
  visibleRead.dispose();
  socket.disconnect();
});
</script>

<template>
  <section
    class="chat-panel"
    :class="{
      'chat-panel--fullscreen': !embedded,
      'chat-panel--embedded': embedded,
    }"
  >
    <ChatConversationHeader
      :conversation="activeConversation"
      :show-back="showBack"
      @back="emit('back')"
    />

    <div
      ref="scrollArea"
      class="scroll"
    >
      <ChatMessageFeed
        :messages="messages"
        :loading="loading"
        :has-conversation="Boolean(activeConversation)"
        :empty-text="emptyText"
        :can-send="canSend"
        :self-id="auth.profile?.id"
        @reply="compose.setReply"
      />
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
