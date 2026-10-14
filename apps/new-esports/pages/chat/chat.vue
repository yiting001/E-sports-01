<template>
  <view class="chat">
    <!-- 头部：会话标题 + 状态提示（客服待接入/已接入、订单群成员数） -->
    <view class="chat-head">
      <text class="type-body chat-title">
        {{ title }}
      </text>
      <text class="type-label chat-status">
        {{ statusText }}
      </text>
    </view>

    <!-- 消息区：进房时由服务端 ack 回传最近历史，实时消息经 im:receive 追加。
         这里用页面滚动而非内层 scroll-view：H5 的 100vh 含导航栏高度，内层滚动容器会把输入栏挤出可视区 -->
    <view class="chat-body">
      <view class="chat-list">
        <view
          v-for="(message, index) in messages"
          :id="`msg-${message.id}`"
          :key="message.id"
          class="msg"
        >
          <text
            v-if="showTimeDivider(index)"
            class="type-label msg-time"
          >
            {{ formatDateTime(message.createdAt) }}
          </text>

          <!-- 系统消息：居中弱化 -->
          <view
            v-if="message.type === MessageType.System"
            class="msg-system"
          >
            <text class="type-small text-faint">
              {{ message.content }}
            </text>
          </view>

          <!-- 普通消息：本人靠右（白底黑字），他人靠左（Dark Surface 白字） -->
          <view
            v-else
            class="msg-row"
            :class="{ 'msg-row--mine': isMine(message) }"
          >
            <view class="msg-avatar">
              <text class="msg-avatar-text">
                {{ initialOf(message) }}
              </text>
            </view>
            <view class="msg-main">
              <text
                v-if="!isMine(message) && showSender"
                class="type-label msg-sender"
              >
                {{ senderLabel(message) }}
              </text>
              <image
                v-if="message.type === MessageType.Image"
                class="msg-image"
                :src="resolveMediaUrl(message.content)"
                mode="widthFix"
                @tap="previewImage(message.content)"
              />
              <view
                v-else
                class="msg-bubble"
                :class="{ 'msg-bubble--mine': isMine(message) }"
              >
                <text class="msg-text">
                  {{ message.content }}
                </text>
              </view>
            </view>
          </view>
        </view>

        <view
          v-if="messages.length === 0 && !historyLoading"
          class="empty"
        >
          还没有消息，先打个招呼吧
        </view>
        <view
          v-else-if="historyLoading"
          class="empty"
        >
          加载中…
        </view>
      </view>
    </view>

    <!-- 输入区：固定在视口底部（文本 + 图片；图片经自助上传后以媒体消息发送） -->
    <view class="chat-input">
      <view
        class="chat-image-btn"
        @tap="onSendImage"
      >
        <text class="chat-image-btn-text">
          ＋
        </text>
      </view>
      <input
        v-model="draft"
        class="input chat-field"
        type="text"
        confirm-type="send"
        placeholder="输入消息…"
        placeholder-class="placeholder"
        @confirm="onSendText"
      >
      <view
        class="btn-primary chat-send"
        :class="{ 'is-disabled': !canSend }"
        @tap="onSendText"
      >
        <text>发送</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad, onUnload } from '@dcloudio/uni-app';
import type { ChatMessage, ConversationDetailView, ConversationView } from '@app/contracts';
import { ConversationStatus, ConversationType, MessageType, SYSTEM_SENDER_ID } from '@app/contracts';
import { uploadApi } from '@/api/upload.api';
import { auth } from '@/stores/auth';
import { im } from '@/stores/im';
import { formatDateTime } from '@/utils/format';
import { resolveMediaUrl } from '@/utils/media-url';
import { toast } from '@/utils/toast';

/**
 * 聊天页：客服会话与订单群聊共用。
 * 消息通道是 WebSocket（im:join 拿历史、im:receive 收实时消息、im:mark-read 推进已读），
 * 会话详情（成员昵称与身份标签）走 REST；图片消息先经 /upload/self 上传再发送。
 */

/** 相邻消息间隔超过该值时插入时间分隔 */
const TIME_DIVIDER_GAP_MS = 5 * 60 * 1000;

const messages = ref<ChatMessage[]>([]);
const memberMap = ref<Record<string, { displayName: string; tag: string }>>({});
const title = ref('消息');
const status = ref<string>(ConversationStatus.Active);
const memberCount = ref(0);
const conversationType = ref<string>(ConversationType.Private);
const draft = ref('');
const historyLoading = ref(true);
let conversationId = '';
let unsubscribeMessage: (() => void) | null = null;
let unsubscribeConversation: (() => void) | null = null;

const myId = computed(() => auth.profile.value?.id ?? '');
const canSend = computed(() => draft.value.trim().length > 0);

/** 他人消息是否展示发送者（群聊/客服内标注身份，私聊不冗余） */
const showSender = computed(
  () => conversationType.value === ConversationType.Group || conversationType.value === ConversationType.Service,
);

const statusText = computed(() => {
  if (conversationType.value === ConversationType.Service) {
    if (status.value === ConversationStatus.Pending) {
      return '等待客服接入…';
    }
    if (status.value === ConversationStatus.Closed) {
      return '会话已结束';
    }
    return '客服已接入';
  }
  if (conversationType.value === ConversationType.Group) {
    return `${memberCount.value} 人群聊`;
  }
  return '';
});

onLoad(async (options?: Record<string, string>) => {
  conversationId = options?.conversationId ?? '';
  if (!conversationId) {
    historyLoading.value = false;
    return;
  }
  if (options?.kind) {
    conversationType.value = options.kind;
  }

  // 直接进入本页（如从分享/刷新）时资料可能尚未加载：先补齐，避免自己的消息被判成他人消息
  if (!auth.profile.value) {
    await auth.restore();
  }

  unsubscribeMessage = im.onMessage((message) => {
    if (message.conversationId !== conversationId) {
      return;
    }
    appendMessage(message);
    if (message.senderId !== myId.value && message.type !== MessageType.System) {
      void im.markRead(conversationId, message.id);
    }
  });
  unsubscribeConversation = im.onConversation((conversation: ConversationView) => {
    if (conversation.id !== conversationId) {
      return;
    }
    applyConversation(conversation);
  });

  // 进房（ack 回传最近历史）+ 会话详情（成员昵称/身份标签）
  const history = await im.joinConversation(conversationId);
  messages.value = [...history].sort((a, b) => a.createdAt - b.createdAt);
  historyLoading.value = false;
  scrollToBottom();
  const last = messages.value[messages.value.length - 1];
  if (last) {
    void im.markRead(conversationId, last.id);
  }
  void loadDetail();
});

onUnload(() => {
  unsubscribeMessage?.();
  unsubscribeConversation?.();
  // 回到列表时同步最后一条消息与未读
  void im.loadConversations();
});

async function loadDetail(): Promise<void> {
  try {
    const detail: ConversationDetailView = await imApiDetail(conversationId);
    const map: Record<string, { displayName: string; tag: string }> = {};
    detail.members.forEach((member) => {
      map[member.userId] = { displayName: member.displayName, tag: member.tag };
    });
    memberMap.value = map;
    applyConversation(detail);
  } catch {
    // 详情失败不影响收发消息
  }
}

/** 会话视图应用（标题 / 状态 / 成员数；服务端实时视图与详情共用） */
function applyConversation(conversation: ConversationView): void {
  title.value = conversation.title || title.value;
  status.value = conversation.status;
  memberCount.value = conversation.memberCount;
  if (conversation.type) {
    conversationType.value = conversation.type;
  }
}

function appendMessage(message: ChatMessage): void {
  if (messages.value.some((item) => item.id === message.id)) {
    return;
  }
  messages.value = [...messages.value, message].sort((a, b) => a.createdAt - b.createdAt);
  scrollToBottom();
}

function scrollToBottom(): void {
  // 下一帧再滚动，确保新气泡已渲染进文档流
  setTimeout(() => {
    uni.pageScrollTo({ scrollTop: 999999, duration: 0 });
  }, 60);
}

function isMine(message: ChatMessage): boolean {
  return message.senderId === myId.value;
}

function initialOf(message: ChatMessage): string {
  if (message.senderId === SYSTEM_SENDER_ID) {
    return '系';
  }
  if (isMine(message)) {
    return (auth.profile.value?.nickname ?? '我').slice(0, 1);
  }
  return senderLabel(message).slice(0, 1) || '友';
}

function senderLabel(message: ChatMessage): string {
  const member = memberMap.value[message.senderId];
  if (!member) {
    return '成员';
  }
  return member.tag ? `${member.displayName}（${member.tag}）` : member.displayName;
}

function showTimeDivider(index: number): boolean {
  if (index === 0) {
    return true;
  }
  const previous = messages.value[index - 1];
  const current = messages.value[index];
  return current.createdAt - previous.createdAt > TIME_DIVIDER_GAP_MS;
}

/** 发送文本（服务端广播回 im:receive 后统一追加，避免本地乐观插入造成重复） */
function onSendText(): void {
  const content = draft.value.trim();
  if (!content) {
    return;
  }
  draft.value = '';
  im.sendMessage({ conversationId, type: MessageType.Text, content });
}

/** 发送图片：选择 → 压缩上传 → 发送媒体消息 */
async function onSendImage(): Promise<void> {
  try {
    const uploaded = await uploadApi.chooseAndUploadImage();
    im.sendImage(conversationId, uploaded.url);
  } catch {
    // 取消选择或上传失败均已提示
  }
}

function previewImage(url: string): void {
  const resolved = resolveMediaUrl(url);
  if (resolved) {
    uni.previewImage({ urls: [resolved] });
  }
}

/** 会话详情接口（延迟引入，避免与 stores/im 的循环依赖） */
async function imApiDetail(id: string): Promise<ConversationDetailView> {
  const { imApi } = await import('@/api/im.api');
  return imApi.conversationDetail(id);
}
</script>

<style scoped>
/* 页面自身上下滚动，底部预留输入栏高度，避免最后一条消息被遮挡 */
.chat {
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

/* ===== 头部 ===== */
.chat-head {
  flex-shrink: 0;
  padding: 20rpx 32rpx;
  border-bottom: 1rpx solid var(--c-border);
}

.chat-title {
  display: block;
  color: var(--c-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-status {
  display: block;
  margin-top: 8rpx;
}

/* ===== 消息区 ===== */
.chat-list {
  padding: 24rpx 32rpx 32rpx;
}

.msg {
  margin-top: 8rpx;
}

.msg-time {
  display: block;
  margin: 24rpx 0 12rpx;
  text-align: center;
}

.msg-system {
  display: flex;
  justify-content: center;
  padding: 12rpx 0;
}

.msg-row {
  display: flex;
  align-items: flex-start;
  margin-top: 16rpx;
}

.msg-row--mine {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 64rpx;
  height: 64rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-xs);
  background-color: var(--c-surface);
  border: 1rpx solid var(--c-border);
}

.msg-avatar-text {
  color: var(--c-silver);
  font-size: 26rpx;
  line-height: 1;
}

.msg-main {
  max-width: 72%;
  margin: 0 20rpx;
  display: flex;
  flex-direction: column;
}

.msg-row--mine .msg-main {
  align-items: flex-end;
}

.msg-sender {
  margin-bottom: 8rpx;
}

/* 气泡：他人 Dark Surface，本人纯白（界面无色相，白色即本人强调） */
.msg-bubble {
  padding: 20rpx 24rpx;
  border-radius: var(--radius-md);
  background-color: var(--c-surface);
  border: 1rpx solid var(--c-border);
}

.msg-bubble--mine {
  background-color: var(--c-text);
  border-color: var(--c-text);
}

.msg-text {
  color: var(--c-text);
  font-size: 28rpx;
  line-height: 1.5;
  word-break: break-word;
}

.msg-bubble--mine .msg-text {
  color: #000000;
}

.msg-image {
  width: 360rpx;
  border-radius: var(--radius-md);
  background-color: var(--c-surface);
}

/* ===== 输入区（视口固定） ===== */
.chat-input {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid var(--c-border);
  background-color: var(--c-bg);
}

.chat-image-btn {
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid var(--c-border);
  border-radius: var(--radius-xs);
  margin-right: 16rpx;
}

.chat-image-btn-text {
  color: var(--c-text-secondary);
  font-size: 32rpx;
  line-height: 1;
}

.chat-field {
  flex: 1;
  min-width: 0;
  height: 72rpx;
}

.chat-send {
  width: 140rpx;
  height: 72rpx;
  flex-shrink: 0;
  margin-left: 16rpx;
  font-size: 26rpx;
}
</style>
