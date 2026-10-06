<template>
  <view class="message">
    <view class="sec-title panel-title">
      <text class="sec-title-text">
        会话消息
      </text>
    </view>

    <view
      v-if="auth.isLoggedIn && conversations.length"
      class="card list"
    >
      <view
        v-for="conv in conversations"
        :key="conv.id"
        class="entry"
        hover-class="entry-hover"
        @tap="openConversation(conv)"
      >
        <view class="avatar">
          <image
            class="avatar-icon"
            src="/static/icons/headset.png"
            mode="aspectFit"
          />
        </view>
        <view class="body">
          <text class="title">
            {{ conv.title || '在线客服' }}
          </text>
          <text class="subtitle">
            {{ lastMessageText(conv.lastMessage) }}
          </text>
        </view>
        <view class="meta">
          <text
            v-if="conv.lastMessage"
            class="time"
          >
            {{ formatConversationTime(conv.lastMessage.createdAt) }}
          </text>
          <view
            v-if="conv.unread > 0"
            class="unread"
          >
            <text class="unread-text">
              {{ conv.unread > 99 ? '99+' : conv.unread }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <view
      v-else-if="auth.isLoggedIn"
      class="card empty"
    >
      <image
        class="empty-icon"
        src="/static/icons/chat-empty.png"
        mode="aspectFit"
      />
      <text class="empty-text">
        {{ loading ? '加载中…' : '暂无会话消息' }}
      </text>
    </view>

    <view
      v-else
      class="card empty"
    >
      <image
        class="empty-icon"
        src="/static/icons/chat-empty.png"
        mode="aspectFit"
      />
      <text class="empty-text">
        登录后查看会话消息
      </text>
      <button
        class="login-btn"
        @tap="gotoLogin"
      >
        去登录
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow, onShareAppMessage } from '@dcloudio/uni-app';
import { ref } from 'vue';
import type { ChatMessage, ConversationView } from '@app/contracts';
import { MessageType } from '@app/contracts';
import { imApi } from '@/api/im.api';
import { useRequireLogin } from '@/composables/use-require-login';
import { useAuthStore } from '@/stores/auth.store';
import { formatConversationTime } from '@/utils/format';

/**
 * 会话消息页：与原版 apps/client 的 MessageView 一致，只展示会话列表
 * （客服入口在「我的」页，避免重复入口）；移动端点击进入全屏聊天。
 */
const { gotoLogin } = useRequireLogin(false);
const auth = useAuthStore();

const conversations = ref<ConversationView[]>([]);
const loading = ref(false);

onShareAppMessage(() => ({
  title: '会话消息',
  path: '/pages/home/home',
}));

onShow(() => {
  if (!auth.isLoggedIn) {
    return;
  }
  void refresh();
});

async function refresh(): Promise<void> {
  if (loading.value) {
    return;
  }
  loading.value = true;
  try {
    conversations.value = await imApi.listConversations();
  } catch {
    // 错误已统一提示
  } finally {
    loading.value = false;
  }
}

/** 最近一条消息摘要：图片/视频以占位文案展示（与原版 lastMessageText 一致） */
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

function openConversation(conversation: ConversationView): void {
  uni.navigateTo({ url: `/pages/chat/chat?id=${conversation.id}` });
}
</script>

<style scoped>
.message {
  min-height: 100vh;
  padding: 24rpx;
  box-sizing: border-box;
}

.panel-title {
  margin-bottom: 24rpx;
}

.sec-title {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.sec-title::before {
  content: '';
  width: 10rpx;
  height: 32rpx;
  background-color: #ffb020;
  transform: skewX(-18deg);
}

.sec-title-text {
  color: #e9eef6;
  font-size: 30rpx;
  font-weight: 800;
  font-style: italic;
  letter-spacing: 2rpx;
}

.list {
  padding: 12rpx 0;
}

.entry {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 28rpx 32rpx;
}

.entry + .entry {
  border-top: 1rpx solid rgba(150, 165, 195, 0.16);
}

.entry-hover {
  background-color: rgba(255, 176, 32, 0.08);
}

.avatar {
  flex-shrink: 0;
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 176, 32, 0.14);
  clip-path: polygon(16rpx 0, 100% 0, 100% calc(100% - 16rpx), calc(100% - 16rpx) 100%, 0 100%, 0 16rpx);
}

.avatar-icon {
  width: 44rpx;
  height: 44rpx;
}

.body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.title {
  color: #e9eef6;
  font-size: 30rpx;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subtitle {
  color: #67738c;
  font-size: 24rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12rpx;
}

.time {
  color: #67738c;
  font-size: 22rpx;
}

.unread {
  min-width: 36rpx;
  height: 36rpx;
  padding: 0 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffb020;
  border-radius: 18rpx;
  box-sizing: border-box;
}

.unread-text {
  color: #0b0e14;
  font-size: 22rpx;
  font-weight: 700;
}

.empty {
  padding: 128rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.empty-icon {
  width: 72rpx;
  height: 72rpx;
  opacity: 0.8;
}

.empty-text {
  color: #67738c;
  font-size: 26rpx;
}

.login-btn {
  margin-top: 12rpx;
  width: 280rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1a1205;
  font-size: 30rpx;
  font-weight: 600;
  background-color: #ffb020;
  border-radius: 8rpx;
  clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
}
</style>
