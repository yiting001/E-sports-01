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
        class="chat-hint"
      >
        <text class="chat-hint-text">
          接入中…
        </text>
      </view>
      <view
        v-for="message in messages"
        :id="`msg-${message.id}`"
        :key="message.id"
        class="msg-row"
        :class="{ 'msg-row-mine': isSelf(message), 'msg-row-system': isSystem(message) }"
      >
        <view
          v-if="isSystem(message)"
          class="msg-system"
        >
          <text class="msg-system-text">
            {{ message.content }}
          </text>
        </view>
        <template v-else>
          <view class="msg-col">
            <view class="msg-sender">
              <text class="msg-sender-name">
                {{ senderName(message.senderId) }}
              </text>
              <text
                v-if="senderTag(message.senderId)"
                class="msg-sender-tag"
              >
                {{ senderTag(message.senderId) }}
              </text>
            </view>
            <view class="msg-bubble">
              <view
                v-if="message.replyTo"
                class="msg-reply"
              >
                <text class="msg-reply-name">
                  {{ message.replyTo.senderName }}
                </text>
                <text class="msg-reply-content">
                  {{ replyPreview(message.replyTo) }}
                </text>
              </view>
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
                mode="widthFix"
                @tap="previewImage(message.content)"
              />
              <video
                v-else-if="message.type === 'video'"
                class="msg-video"
                :src="message.content"
                object-fit="contain"
              />
              <text
                v-else
                class="msg-content"
              >
                [不支持的消息类型]
              </text>
              <text class="msg-time">
                {{ formatChatTime(message.createdAt) }}
              </text>
            </view>
          </view>
          <button
            v-if="canSend"
            class="msg-quote"
            @tap="setReply(message)"
          >
            ↩
          </button>
        </template>
      </view>
      <view
        :id="anchorId"
        class="chat-anchor"
      />
    </scroll-view>

    <view
      v-if="replyTarget"
      class="reply-bar"
    >
      <view class="reply-bar-info">
        <text class="reply-bar-name">
          引用 {{ senderName(replyTarget.senderId) }}
        </text>
        <text class="reply-bar-content">
          {{ replyPreview(replyTarget) }}
        </text>
      </view>
      <text
        class="reply-bar-cancel"
        @tap="clearReply"
      >
        ×
      </text>
    </view>

    <view class="chat-footer">
      <button
        class="tool-btn"
        :disabled="uploading"
        @tap="sendImage"
      >
        图
      </button>
      <button
        class="tool-btn"
        :disabled="uploading"
        @tap="sendVideo"
      >
        视频
      </button>
      <input
        v-model="draft"
        class="input chat-input"
        confirm-type="send"
        :maxlength="2000"
        :placeholder="canSend ? (uploading ? '发送中…' : '输入消息…') : '会话不可发送'"
        placeholder-class="placeholder"
        @confirm="sendText"
      >
      <button
        class="btn-primary chat-send"
        :class="{ disabled: !canSend || !draft.trim() }"
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
import type { ChatMessage, ConversationMemberView, SendMessagePayload } from '@app/contracts';
import { MessageType } from '@app/contracts';
import { imApi } from '@/api/im.api';
import { uploadApi } from '@/api/upload.api';
import { createImSocket } from '@/im/im-socket';
import { useAuthStore } from '@/stores/auth.store';
import { formatChatTime } from '@/utils/format';
import { toast } from '@/utils/toast';

const auth = useAuthStore();
const conversationId = ref('');
const messages = ref<ChatMessage[]>([]);
const members = ref<ConversationMemberView[]>([]);
const draft = ref('');
const historyLoading = ref(false);
const scrollAnchor = ref('');
const anchorId = 'chat-bottom-anchor';
const replyTarget = ref<ChatMessage | null>(null);
const uploading = ref(false);
const myUserId = computed(() => auth.profile?.id ?? '');

const im = createImSocket();

const canSend = computed(() => Boolean(conversationId.value) && auth.isLoggedIn);

onShareAppMessage(() => ({
  title: '聊天',
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
    members.value = detail.members;
    uni.setNavigationBarTitle({ title: detail.title || '聊天' });
  } catch {
    // 标题/成员读取失败不阻塞聊天
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
  }, 80);
}

function isSelf(message: ChatMessage): boolean {
  return message.senderId === myUserId.value;
}

function isSystem(message: ChatMessage): boolean {
  return message.type === MessageType.System;
}

function senderName(senderId: string): string {
  const member = members.value.find((item) => item.userId === senderId);
  return member?.displayName || (senderId === myUserId.value ? '我' : '用户');
}

function senderTag(senderId: string): string {
  return members.value.find((item) => item.userId === senderId)?.tag ?? '';
}

function replyPreview(message: Pick<ChatMessage, 'type' | 'content'>): string {
  if (message.type === MessageType.Image) {
    return '[图片]';
  }
  if (message.type === MessageType.Video) {
    return '[视频]';
  }
  return message.content;
}

function setReply(message: ChatMessage): void {
  replyTarget.value = message;
}

function clearReply(): void {
  replyTarget.value = null;
}


function sendPayload(type: MessageType, content: string): void {
  const payload: SendMessagePayload = {
    conversationId: conversationId.value,
    type,
    content,
  };
  if (replyTarget.value) {
    payload.replyToId = replyTarget.value.id;
    clearReply();
  }
  im.send(payload);
  // 服务端广播回显，本地不插入避免重复
  draft.value = '';
  scrollToBottom();
}

function sendText(): void {
  const content = draft.value.trim();
  if (!content || !canSend.value) {
    return;
  }
  sendPayload(MessageType.Text, content);
}

async function pickAndSendMedia(type: MessageType.Image | MessageType.Video): Promise<void> {
  if (uploading.value || !canSend.value) {
    return;
  }
  uploading.value = true;
  try {
    let tempFilePath = '';
    if (type === MessageType.Image) {
      tempFilePath = await new Promise<string>((resolve, reject) => {
        uni.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          success: (result) => resolve(result.tempFilePaths[0] ?? ''),
          fail: () => reject(new Error('未选择图片')),
        });
      });
    } else {
      tempFilePath = await new Promise<string>((resolve, reject) => {
        uni.chooseMedia({
          count: 1,
          mediaType: ['video'],
          maxDuration: 30,
          success: (result) => resolve(result.tempFiles[0]?.tempFilePath ?? ''),
          fail: () => reject(new Error('未选择视频')),
        });
      });
    }
    const uploaded = await uploadApi.uploadTempFile(
      tempFilePath,
      type === MessageType.Image ? '图片' : '视频',
    );
    sendPayload(type, uploaded.url);
  } catch {
    // 未选择或上传失败已统一提示
  } finally {
    uploading.value = false;
  }
}

function sendImage(): void {
  void pickAndSendMedia(MessageType.Image);
}

function sendVideo(): void {
  void pickAndSendMedia(MessageType.Video);
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

.chat-hint {
  text-align: center;
  padding: 12rpx 0;
}

.chat-hint-text {
  color: #67738c;
  font-size: 22rpx;
}

.msg-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 24rpx;
}

.msg-row-mine {
  flex-direction: row-reverse;
}

.msg-row-mine .msg-col {
  align-items: flex-end;
}

.msg-col {
  display: flex;
  flex-direction: column;
  max-width: 75%;
  min-width: 0;
}

.msg-row-system {
  justify-content: center;
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

.msg-sender {
  display: flex;
  align-items: baseline;
  gap: 10rpx;
  margin-bottom: 8rpx;
}

.msg-sender-name {
  color: #9aa6bb;
  font-size: 22rpx;
}

.msg-sender-tag {
  color: #ffb020;
  font-size: 20rpx;
  border: 1rpx solid rgba(255, 176, 32, 0.4);
  border-radius: 6rpx;
  padding: 2rpx 10rpx;
}

.msg-bubble {
  background-color: #1a2130;
  border: 1rpx solid rgba(150, 165, 195, 0.16);
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
}

.msg-row-mine .msg-bubble {
  background-color: rgba(255, 176, 32, 0.16);
  border-color: rgba(255, 176, 32, 0.4);
}

.msg-reply {
  border-left: 4rpx solid rgba(255, 176, 32, 0.5);
  background-color: rgba(11, 14, 20, 0.5);
  border-radius: 6rpx;
  padding: 8rpx 14rpx;
  margin-bottom: 10rpx;
}

.msg-reply-name {
  display: block;
  color: #ffb020;
  font-size: 20rpx;
}

.msg-reply-content {
  display: block;
  margin-top: 4rpx;
  color: #9aa6bb;
  font-size: 22rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  display: block;
}

.msg-video {
  width: 360rpx;
  height: 260rpx;
  border-radius: 8rpx;
  display: block;
}

.msg-time {
  display: block;
  margin-top: 8rpx;
  color: #67738c;
  font-size: 20rpx;
  text-align: right;
}

.msg-quote {
  width: 56rpx;
  height: 56rpx;
  margin: 0 12rpx;
  align-self: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #67738c;
  font-size: 26rpx;
  border: 1rpx solid rgba(150, 165, 195, 0.24);
  border-radius: 8rpx;
}

.chat-anchor {
  height: 1rpx;
}

.reply-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 14rpx 24rpx;
  background-color: #0e1220;
  border-top: 1rpx solid rgba(150, 165, 195, 0.16);
}

.reply-bar-info {
  flex: 1;
  min-width: 0;
}

.reply-bar-name {
  display: block;
  color: #ffb020;
  font-size: 22rpx;
}

.reply-bar-content {
  display: block;
  margin-top: 4rpx;
  color: #9aa6bb;
  font-size: 22rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reply-bar-cancel {
  color: #67738c;
  font-size: 40rpx;
  padding: 0 12rpx;
  flex-shrink: 0;
}

.chat-footer {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background-color: #131926;
  border-top: 1rpx solid rgba(150, 165, 195, 0.16);
}

.tool-btn {
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9aa6bb;
  font-size: 24rpx;
  background-color: #1a2130;
  border: 1rpx solid rgba(150, 165, 195, 0.24);
  border-radius: 8rpx;
}

.tool-btn[disabled] {
  opacity: 0.45;
}

.chat-input {
  flex: 1;
}

.chat-send {
  width: 140rpx;
  flex-shrink: 0;
}

.placeholder {
  color: #67738c;
}
</style>
