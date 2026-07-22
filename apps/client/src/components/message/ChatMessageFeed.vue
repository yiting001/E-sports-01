<script setup lang="ts">
import {
  MessageType,
  SYSTEM_SENDER_ID,
  type ChatMessage,
  type ConversationMemberView,
} from '@app/contracts';
import DOMPurify from 'dompurify';
import AppIcon from '@/components/common/AppIcon.vue';
import ChatMedia from '@/components/message/ChatMedia.vue';
import ChatReplyQuote from '@/components/message/ChatReplyQuote.vue';
import { resolveChatMemberName } from '@/composables/use-chat-compose';

const props = defineProps<{
  messages: ChatMessage[];
  loading: boolean;
  hasConversation: boolean;
  emptyText: string;
  canSend: boolean;
  selfId?: string;
  members: ConversationMemberView[];
}>();

const emit = defineEmits<{
  reply: [message: ChatMessage];
}>();

function isSelf(message: ChatMessage): boolean {
  return message.senderId === props.selfId;
}

function isSystem(message: ChatMessage): boolean {
  return message.senderId === SYSTEM_SENDER_ID;
}

/** 消息与历史引用都只从成员安全展示名解析，避免回显旧快照中的登录账号。 */
function senderNameForId(senderId: string): string {
  if (senderId === props.selfId) {
    return '我';
  }
  return resolveChatMemberName(props.members, senderId);
}

function mentionedMe(message: ChatMessage): boolean {
  return Boolean(props.selfId && message.mentions?.includes(props.selfId));
}

function safeHtml(content: string): string {
  return DOMPurify.sanitize(content);
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<template>
  <p
    v-if="loading"
    class="hint"
  >
    接入中…
  </p>
  <p
    v-else-if="!hasConversation"
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
    v-for="message in messages"
    :key="message.id"
  >
    <div
      v-if="isSystem(message)"
      class="sys"
    >
      <!-- eslint-disable vue/no-v-html -->
      <span
        class="sys-body"
        v-html="safeHtml(message.content)"
      />
      <!-- eslint-enable vue/no-v-html -->
    </div>
    <div
      v-else
      class="row"
      :class="{ 'row--self': isSelf(message) }"
    >
      <div class="col">
        <span class="sender">{{ senderNameForId(message.senderId) }}</span>
        <div
          class="bubble"
          :class="{ 'bubble--mention': mentionedMe(message) }"
        >
          <ChatReplyQuote
            v-if="message.replyTo"
            :sender-name="senderNameForId(message.replyTo.senderId)"
            :type="message.replyTo.type"
            :content="message.replyTo.content"
          />
          <p
            v-if="message.type === MessageType.Text"
            class="text"
          >
            {{ message.content }}
          </p>
          <ChatMedia
            v-else-if="message.type === MessageType.Image"
            type="image"
            :url="message.content"
          />
          <ChatMedia
            v-else-if="message.type === MessageType.Video"
            type="video"
            :url="message.content"
          />
          <span class="time">{{ formatTime(message.createdAt) }}</span>
        </div>
      </div>
      <button
        v-if="canSend"
        class="quote-btn"
        aria-label="引用回复"
        @click="emit('reply', message)"
      >
        <AppIcon
          name="reply"
          :size="14"
        />
      </button>
    </div>
  </template>
</template>
