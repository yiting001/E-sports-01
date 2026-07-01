<script setup lang="ts">
import type { ChatMessage, ConversationView } from '@app/contracts';
import { ConversationType, MessageType } from '@app/contracts';
import { nextTick, ref, watch } from 'vue';
import {
  CloseBold,
  EditPen,
  Picture,
  Promotion,
  User,
  VideoCamera,
} from '@element-plus/icons-vue';
import { sanitizeHtml } from '@/utils/sanitize-html';
import {
  conversationInitial,
  conversationTypeLabel,
  conversationTypeTone,
  formatImTime,
  messageTypeLabel,
  statusLabel,
  statusTone,
} from './im-ui';

const props = defineProps<{
  active: ConversationView | undefined;
  messages: ChatMessage[];
  draft: string;
  uploading: boolean;
  canManage: boolean;
  isSelf: (message: ChatMessage) => boolean;
  isSystem: (message: ChatMessage) => boolean;
}>();

const emit = defineEmits<{
  'update:draft': [value: string];
  send: [];
  sendMedia: [file: File, type: MessageType.Image | MessageType.Video];
  rename: [];
  openMembers: [];
  leave: [];
}>();

const listRef = ref<HTMLElement | null>(null);

function waitForFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

async function scrollToBottom(): Promise<void> {
  await nextTick();
  await waitForFrame();
  if (listRef.value) {
    listRef.value.scrollTop = listRef.value.scrollHeight;
  }
}

watch(
  () => [props.active?.id, props.messages.length],
  () => {
    void scrollToBottom();
  },
  { flush: 'post' },
);
</script>

<template>
  <section class="im-chat">
    <template v-if="active">
      <header class="im-chat__head">
        <div class="im-chat__identity">
          <span :class="['im-chat__avatar', `is-${conversationTypeTone(active.type)}`]">
            {{ conversationInitial(active.title) }}
          </span>
          <div>
            <h2>{{ active.title }}</h2>
            <span class="im-chat__meta">
              <span :class="['im-type', `is-${conversationTypeTone(active.type)}`]">
                {{ conversationTypeLabel(active.type) }}
              </span>
              <span :class="['im-dot-status', `is-${statusTone(active.status)}`]">
                {{ statusLabel(active.status) }}
              </span>
              <small>{{ active.memberCount }} 位成员</small>
              <time>{{ formatImTime(active.updatedAt) }}</time>
            </span>
          </div>
        </div>
        <div
          v-if="active.type === ConversationType.Group"
          class="im-chat__actions"
        >
          <el-button
            v-if="canManage"
            :icon="EditPen"
            @click="emit('rename')"
          >
            改名
          </el-button>
          <el-button
            :icon="User"
            @click="emit('openMembers')"
          >
            成员
          </el-button>
          <el-button
            type="danger"
            :icon="CloseBold"
            @click="emit('leave')"
          >
            退群
          </el-button>
        </div>
      </header>

      <div class="im-message-stage">
        <div
          ref="listRef"
          class="im-messages"
        >
          <div
            v-for="message in messages"
            :key="message.id"
          >
            <!-- 系统消息可能包含配置中心维护的富文本，渲染前统一净化 -->
            <!-- eslint-disable vue/no-v-html -->
            <div
              v-if="isSystem(message)"
              class="im-system"
              v-html="sanitizeHtml(message.content)"
            />
            <!-- eslint-enable vue/no-v-html -->
            <div
              v-else
              :class="['im-message', { 'is-self': isSelf(message) }]"
            >
              <span class="im-message__avatar">
                {{ message.senderId.slice(0, 2).toUpperCase() }}
              </span>
              <div class="im-message__content">
                <div class="im-message__meta">
                  <span>{{ message.senderId.slice(0, 8) }}</span>
                  <span>{{ messageTypeLabel(message.type) }}</span>
                  <time>{{ formatImTime(message.createdAt) }}</time>
                </div>
                <div
                  v-if="message.type === MessageType.Text"
                  class="im-bubble"
                >
                  {{ message.content }}
                </div>
                <img
                  v-else-if="message.type === MessageType.Image"
                  :src="message.content"
                  class="im-media"
                  alt="聊天图片"
                  @load="scrollToBottom"
                >
                <video
                  v-else
                  :src="message.content"
                  controls
                  class="im-media"
                  @loadedmetadata="scrollToBottom"
                />
              </div>
            </div>
          </div>
          <el-empty
            v-if="messages.length === 0"
            :image-size="110"
            description="暂无消息"
          />
        </div>
      </div>

      <div class="im-composer">
        <div class="im-composer__box">
          <div class="im-composer__bar">
            <div class="im-composer__tools">
              <el-upload
                class="im-composer__tool"
                accept="image/*"
                :show-file-list="false"
                :before-upload="
                  (file: File) => {
                    emit('sendMedia', file, MessageType.Image);
                    return false;
                  }
                "
              >
                <el-tooltip content="发送图片">
                  <el-button
                    text
                    :icon="Picture"
                    :loading="uploading"
                    aria-label="发送图片"
                  />
                </el-tooltip>
              </el-upload>
              <el-upload
                class="im-composer__tool"
                accept="video/*"
                :show-file-list="false"
                :before-upload="
                  (file: File) => {
                    emit('sendMedia', file, MessageType.Video);
                    return false;
                  }
                "
              >
                <el-tooltip content="发送视频">
                  <el-button
                    text
                    :icon="VideoCamera"
                    :loading="uploading"
                    aria-label="发送视频"
                  />
                </el-tooltip>
              </el-upload>
            </div>
          </div>
          <el-input
            :model-value="draft"
            type="textarea"
            resize="none"
            :autosize="{ minRows: 3, maxRows: 6 }"
            class="im-composer__input"
            placeholder="输入消息"
            @update:model-value="emit('update:draft', String($event))"
            @keydown.enter.exact.prevent="emit('send')"
          />
          <div class="im-composer__footer">
            <el-button
              type="primary"
              :icon="Promotion"
              @click="emit('send')"
            >
              发送
            </el-button>
          </div>
        </div>
      </div>
    </template>
    <div
      v-else
      class="im-placeholder"
    >
      选择左侧会话开始聊天
    </div>
  </section>
</template>
