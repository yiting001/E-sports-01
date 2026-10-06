<template>
  <view class="chat">
    <scroll-view
      class="chat-body"
      scroll-y
      :scroll-into-view="scrollAnchor"
      scroll-with-animation
    >
      <view
        v-if="historyLoading"
        class="chat-history-loading"
      >
        <text class="text-muted">
          加载历史消息…
        </text>
      </view>
      <view
        v-for="(message, index) in messages"
        :id="`msg-${message.id}`"
        :key="message.id"
        class="msg-row"
        :class="{ 'msg-row-mine': message.senderId === myUserId, 'msg-row-system': message.type === 'system' }"
      >
        <view
          v-if="message.type === 'system'"
          class="msg-system"
        >
          <text class="msg-system-text">
            {{ message.content }}
          </text>
        </view>
        <template v-else>
          <text
            v-if="showTime(index)"
            class="msg-time"
          >
            {{ formatChatTime(message.createdAt) }}
          </text>
          <view
            class="msg-bubble"
            :class="{ 'msg-bubble-mine': message.senderId === myUserId }"
          >
            <text
              v-if="message.type === 'text'"
              class="msg-content"
            >
              {{ message.content }}
            </text>
            <image
              v-else-if="message.type === 'image'"
              class="msg-image"
              :src="message.content"
              mode="aspectFill"
              @tap="previewImage(message.content)"
            />
            <text
              v-else
              class="msg-content"
            >
              [不支持的消息类型]
            </text>
          </view>
        </template>
      </view>
      <view
        :id="anchorId"
        class="chat-anchor"
      />
    </scroll-view>

    <view class="chat-footer">
      <input
        v-model="draft"
        class="input chat-input"
        confirm-type="send"
        :maxlength="2000"
        placeholder="输入消息…"
        placeholder-class="placeholder"
        @confirm="sendText"
      >
      <button
        class="btn-primary chat-send"
        :class="{ disabled: !canSend }"
        @tap="sendText"
      >
        发送
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onLoad, onUnload, onShareAppMessage } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import type { ChatMessage } from '@app/contracts';
import { MessageType } from '@app/contracts';
import { imApi } from '@/api/im.api';
import { createImSocket } from '@/im/im-socket';
import { useAuthStore } from '@/stores/auth.store';
import { formatChatTime } from '@/utils/format';
import { toast } from '@/utils/toast';

const auth = useAuthStore();
const conversationId = ref('');
const conversationTitle = ref('聊天');
const messages = ref<ChatMessage[]>([]);
const draft = ref('');
const historyLoading = ref(false);
const scrollAnchor = ref('');
const anchorId = 'chat-bottom-anchor';
const myUserId = computed(() => auth.profile?.id ?? '');

const im = createImSocket();

const canSend = computed(() => draft.value.trim().length > 0);

onShareAppMessage(() => ({
  title: conversationTitle.value,
  path: '/pages/home/home',
}));

onLoad(async (options) => {
  conversationId.value = options?.id ?? '';
  if (!conversationId.value || !auth.isLoggedIn) {
    toast('会话不存在或未登录');
    uni.navigateBack();
    return;
  }
  try {
    const detail = await imApi.conversationDetail(conversationId.value);
    conversationTitle.value = detail.title || '聊天';
    uni.setNavigationBarTitle({ title: conversationTitle.value });
  } catch {
    // 标题读取失败不阻塞聊天
  }
  connectSocket();
});

onUnload(() => {
  im.disconnect();
});

function connectSocket(): void {
  im.connect();
  im.onError((error) => {
    toast(error.message || '连接异常，请稍后重试');
  });
  im.onConversation(() => {
    // 会话标题/成员变更由服务端权威推送；MVP 只刷新标题
    void imApi
      .conversationDetail(conversationId.value)
      .then((detail) => {
        conversationTitle.value = detail.title || '聊天';
      })
      .catch(() => undefined);
  });
  im.onReceive((message) => {
    if (message.conversationId !== conversationId.value) {
      return;
    }
    appendMessage(message);
  });
  void joinRoom();
}

async function joinRoom(): Promise<void> {
  historyLoading.value = true;
  try {
    const history = await im.join(conversationId.value);
    messages.value = history;
    markLastRead();
    scrollToBottom();
  } finally {
    historyLoading.value = false;
  }
}

function appendMessage(message: ChatMessage): void {
  if (messages.value.some((existing) => existing.id === message.id)) {
    return;
  }
  messages.value = [...messages.value, message];
  scrollToBottom();
  if (message.senderId !== myUserId.value) {
    im.markRead(conversationId.value, message.id);
  }
}

function markLastRead(): void {
  const last = messages.value[messages.value.length - 1];
  if (last && last.senderId !== myUserId.value) {
    void im.markRead(conversationId.value, last.id);
  }
}

function scrollToBottom(): void {
  scrollAnchor.value = '';
  setTimeout(() => {
    scrollAnchor.value = anchorId;
  }, 50);
}

function showTime(index: number): boolean {
  if (index === 0) {
    return true;
  }
  const previous = messages.value[index - 1];
  return messages.value[index].createdAt - previous.createdAt > 5 * 60 * 1000;
}

function sendText(): void {
  const content = draft.value.trim();
  if (!content) {
    return;
  }
  im.send({
    conversationId: conversationId.value,
    type: MessageType.Text,
    content,
  });
  // 服务端广播回显，本地不插入避免重复
  draft.value = '';
  scrollToBottom();
}

function previewImage(url: string): void {
  uni.previewImage({ urls: [url] });
}
</script>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.chat-body {
  flex: 1;
  height: 0;
  padding: 24rpx;
  box-sizing: border-box;
}

.chat-history-loading {
  text-align: center;
  font-size: 22rpx;
  padding: 12rpx 0;
}

.msg-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 20rpx;
}

.msg-row-mine {
  align-items: flex-end;
}

.msg-row-system {
  align-items: center;
}

.msg-system {
  background-color: rgba(150, 165, 195, 0.1);
  border-radius: 8rpx;
  padding: 8rpx 20rpx;
}

.msg-system-text {
  color: #67738c;
  font-size: 22rpx;
}

.msg-time {
  color: #67738c;
  font-size: 20rpx;
  margin-bottom: 8rpx;
}

.msg-bubble {
  max-width: 70%;
  background-color: #1a2130;
  border: 1rpx solid rgba(150, 165, 195, 0.16);
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
}

.msg-bubble-mine {
  background-color: rgba(255, 176, 32, 0.16);
  border-color: rgba(255, 176, 32, 0.4);
}

.msg-content {
  color: #e9eef6;
  font-size: 28rpx;
  line-height: 1.5;
  word-break: break-all;
}

.msg-image {
  width: 320rpx;
  border-radius: 8rpx;
}

.chat-anchor {
  height: 1rpx;
}

.chat-footer {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background-color: #131926;
  border-top: 1rpx solid rgba(150, 165, 195, 0.16);
}

.chat-input {
  flex: 1;
}

.chat-send {
  width: 140rpx;
  flex-shrink: 0;
}
</style>
