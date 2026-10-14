<template>
  <view class="messages">
    <!-- 未登录：消息需要登录 -->
    <view
      v-if="!isLoggedIn"
      class="card guide"
    >
      <text class="type-title guide-title">
        登录后查看消息
      </text>
      <text class="type-small text-muted guide-text">
        客服会话与订单群聊都在这里，客服接入后可直接沟通售后。
      </text>
      <view
        class="btn-primary guide-action"
        @tap="gotoLogin"
      >
        <text>去登录</text>
      </view>
    </view>

    <template v-else>
      <!-- 联系客服：发起新的客服会话 -->
      <view
        class="entry"
        @tap="onContactService"
      >
        <view class="entry-main">
          <text class="type-body entry-title">
            联系客服
          </text>
          <text class="type-small text-muted entry-desc">
            下单/售后问题，客服会拉群一对一处理
          </text>
        </view>
        <text class="entry-arrow">
          ›
        </text>
      </view>

      <view
        v-if="conversations.length > 0"
        class="list"
      >
        <view
          v-for="conversation in conversations"
          :key="conversation.id"
          class="row"
          @tap="openConversation(conversation)"
        >
          <view class="row-main">
            <view class="row-head">
              <text class="type-body row-title">
                {{ conversation.title }}
              </text>
              <text class="type-small text-faint row-time">
                {{ timeOf(conversation) }}
              </text>
            </view>
            <view class="row-foot">
              <text class="type-small text-muted row-preview">
                {{ previewOf(conversation) }}
              </text>
              <view
                v-if="conversation.unread > 0"
                class="badge"
              >
                <text class="badge-text">
                  {{ conversation.unread > 99 ? '99+' : conversation.unread }}
                </text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view
        v-else-if="!loading"
        class="empty"
      >
        暂无消息，点上方「联系客服」开始咨询
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import type { ConversationView } from '@app/contracts';
import { ConversationStatus, MessageType } from '@app/contracts';
import { auth } from '@/stores/auth';
import { im } from '@/stores/im';
import { formatDateTime } from '@/utils/format';
import { toast } from '@/utils/toast';

/**
 * 消息列表：客服会话与订单群聊统一列表（含未读数与最后一条消息摘要）。
 * 顶部「联系客服」发起新的客服会话；点会话进入聊天页。
 * 未读汇总由 stores/im 同步到 tabBar 角标。
 */

const { isLoggedIn, restore } = auth;
const { conversations } = im;

const loading = ref(true);

onShow(async () => {
  await restore();
  if (!isLoggedIn.value) {
    loading.value = false;
    return;
  }
  im.ensureConnected();
  await im.loadConversations();
  // tabBar 就绪后兜底同步一次角标（H5 运行时在 tabBar 就绪前的调用会被丢弃）
  im.syncTabBarBadge();
  loading.value = false;
});

onPullDownRefresh(async () => {
  if (isLoggedIn.value) {
    await im.loadConversations();
  }
  uni.stopPullDownRefresh();
});

/** 摘要：文本直出，媒体给出类型占位，系统消息原样展示 */
function previewOf(conversation: ConversationView): string {
  const last = conversation.lastMessage;
  if (!last) {
    return conversation.status === ConversationStatus.Pending ? '等待客服接入…' : '暂无消息';
  }
  if (last.type === MessageType.Image) {
    return '[图片]';
  }
  if (last.type === MessageType.Video) {
    return '[视频]';
  }
  return last.content;
}

function timeOf(conversation: ConversationView): string {
  const stamp = conversation.lastMessage?.createdAt ?? conversation.updatedAt;
  return stamp ? formatDateTime(stamp) : '';
}

/** 会话类型标签（订单群 / 客服 / 私聊），用于聊天页标题区 */
function openConversation(conversation: ConversationView): void {
  uni.navigateTo({
    url: `/pages/chat/chat?conversationId=${conversation.id}&kind=${conversation.type}`,
  });
}

/** 发起客服会话并直接进入聊天页 */
async function onContactService(): Promise<void> {
  try {
    const conversation = await im.startServiceChat('咨询');
    uni.navigateTo({ url: `/pages/chat/chat?conversationId=${conversation.id}&kind=${conversation.type}` });
  } catch {
    toast('客服会话创建失败，请稍后重试');
  }
}

function gotoLogin(): void {
  uni.navigateTo({ url: '/pages/login/login' });
}
</script>

<style scoped>
.messages {
  padding: 24rpx 32rpx 64rpx;
  box-sizing: border-box;
}

/* ===== 未登录引导 ===== */
.guide-title {
  display: block;
  color: var(--c-text);
}

.guide-text {
  display: block;
  margin-top: 16rpx;
}

.guide-action {
  margin-top: 40rpx;
  width: 320rpx;
}

/* ===== 联系客服入口 ===== */
.entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 0;
  border-bottom: 1rpx solid var(--c-border);
}

.entry-main {
  flex: 1;
  min-width: 0;
}

.entry-title {
  display: block;
  color: var(--c-text);
}

.entry-desc {
  display: block;
  margin-top: 8rpx;
}

.entry-arrow {
  color: var(--c-text-tertiary);
  font-size: 32rpx;
  margin-left: 24rpx;
}

/* ===== 会话行 ===== */
.row {
  display: flex;
  padding: 32rpx 0;
  border-bottom: 1rpx solid var(--c-border);
}

.row-main {
  flex: 1;
  min-width: 0;
}

.row-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.row-title {
  flex: 1;
  min-width: 0;
  color: var(--c-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-time {
  flex-shrink: 0;
  margin-left: 20rpx;
}

.row-foot {
  display: flex;
  align-items: center;
  margin-top: 10rpx;
}

.row-preview {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 未读角标：白底黑字（界面无色相，白色即强调） */
.badge {
  min-width: 36rpx;
  height: 36rpx;
  padding: 0 10rpx;
  margin-left: 16rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--c-text);
  border-radius: 18rpx;
  box-sizing: border-box;
}

.badge-text {
  color: #000000;
  font-size: 22rpx;
  line-height: 1;
}
</style>
