<template>
  <view class="message">
    <template v-if="auth.isLoggedIn">
      <view
        v-for="conversation in conversations"
        :key="conversation.id"
        class="card conv-item"
        @tap="openConversation(conversation.id)"
      >
        <view class="conv-avatar">
          <text class="conv-avatar-text">
            {{ conversation.title.slice(0, 1) || '会' }}
          </text>
        </view>
        <view class="conv-body">
          <view class="conv-head">
            <text class="conv-title">
              {{ conversation.title || '会话' }}
            </text>
            <text class="conv-time">
              {{ formatChatTime(conversation.updatedAt) }}
            </text>
          </view>
          <view class="conv-foot">
            <text class="conv-preview">
              {{ previewText(conversation) }}
            </text>
            <view
              v-if="conversation.unread > 0"
              class="conv-badge"
            >
              <text class="conv-badge-text">
                {{ conversation.unread > 99 ? '99+' : conversation.unread }}
              </text>
            </view>
          </view>
        </view>
      </view>
      <empty-state
        v-if="!loading && conversations.length === 0"
        text="暂无会话"
      />

      <view class="service-entry">
        <button
          class="btn-primary"
          :class="{ disabled: starting }"
          @tap="startServiceChat"
        >
          {{ starting ? '创建中…' : '联系在线客服' }}
        </button>
      </view>
    </template>

    <view
      v-else
      class="login-guide"
    >
      <text class="login-guide-title">
        登录后查看消息
      </text>
      <text class="login-guide-sub">
        与客服沟通、接收订单群通知
      </text>
      <button
        class="btn-primary login-guide-btn"
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
import type { ConversationView } from '@app/contracts';
import { MessageType } from '@app/contracts';
import { imApi } from '@/api/im.api';
import emptyState from '@/components/empty-state.vue';
import { useRequireLogin } from '@/composables/use-require-login';
import { formatChatTime } from '@/utils/format';

const { auth, gotoLogin } = useRequireLogin(false);

const conversations = ref<ConversationView[]>([]);
const loading = ref(false);
const starting = ref(false);

onShareAppMessage(() => ({
  title: '消息',
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

function previewText(conversation: ConversationView): string {
  const last = conversation.lastMessage;
  if (!last) {
    return '暂无消息';
  }
  if (last.type === MessageType.Image) {
    return '[图片]';
  }
  if (last.type === MessageType.Video) {
    return '[视频]';
  }
  if (last.type === MessageType.System) {
    return last.content;
  }
  return last.content;
}

function openConversation(conversationId: string): void {
  uni.navigateTo({ url: `/pages/chat/chat?id=${conversationId}` });
}

async function startServiceChat(): Promise<void> {
  if (starting.value) {
    return;
  }
  starting.value = true;
  try {
    const conversation = await imApi.startService();
    uni.navigateTo({ url: `/pages/chat/chat?id=${conversation.id}` });
  } catch {
    // 错误已统一提示
  } finally {
    starting.value = false;
  }
}
</script>

<style scoped>
.message {
  min-height: 100vh;
  padding: 24rpx;
}

.conv-item {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
  align-items: center;
}

.conv-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background-color: rgba(255, 176, 32, 0.12);
  border: 1rpx solid rgba(255, 176, 32, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.conv-avatar-text {
  color: #ffb020;
  font-size: 34rpx;
  font-weight: 700;
}

.conv-body {
  flex: 1;
  min-width: 0;
}

.conv-head {
  display: flex;
  align-items: center;
}

.conv-title {
  flex: 1;
  color: #e9eef6;
  font-size: 30rpx;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conv-time {
  color: #67738c;
  font-size: 22rpx;
  margin-left: 12rpx;
  flex-shrink: 0;
}

.conv-foot {
  display: flex;
  align-items: center;
  margin-top: 8rpx;
}

.conv-preview {
  flex: 1;
  color: #9aa6bb;
  font-size: 24rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conv-badge {
  min-width: 36rpx;
  height: 36rpx;
  border-radius: 18rpx;
  background-color: #ff5449;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
  margin-left: 12rpx;
  flex-shrink: 0;
}

.conv-badge-text {
  color: #ffffff;
  font-size: 20rpx;
}

.service-entry {
  margin-top: 32rpx;
}

.login-guide {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 200rpx 40rpx 0;
}

.login-guide-title {
  color: #e9eef6;
  font-size: 34rpx;
  font-weight: 700;
}

.login-guide-sub {
  margin-top: 12rpx;
  color: #9aa6bb;
  font-size: 26rpx;
}

.login-guide-btn {
  width: 320rpx;
  margin-top: 48rpx;
}
</style>
