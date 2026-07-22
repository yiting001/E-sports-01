<script setup lang="ts">
import type {
  ChatMessage,
  ConversationMemberView,
  ConversationView,
} from '@app/contracts';
import { ConversationType, MessageType } from '@app/contracts';
import { computed, nextTick, ref, watch } from 'vue';
import {
  ChatLineSquare,
  CloseBold,
  EditPen,
  Picture,
  Promotion,
  Search,
  User,
  VideoCamera,
} from '@element-plus/icons-vue';
import {
  replyContentText,
  resolveChatMemberName,
  useChatCompose,
} from '@/composables/use-chat-compose';
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
  /** 当前会话成员（供消息发送者、@选择与引用预览的安全展示名解析） */
  members: ConversationMemberView[];
  /** 当前登录用户 id，用于 @我 高亮与候选排除自己 */
  selfId: string | null;
  isSelf: (message: ChatMessage) => boolean;
  isSystem: (message: ChatMessage) => boolean;
}>();

const emit = defineEmits<{
  'update:draft': [value: string];
  /** 发送文本，附带 @提及与引用字段 */
  send: [extras: { mentions?: string[]; replyToId?: string }];
  sendMedia: [file: File, type: MessageType.Image | MessageType.Video];
  rename: [];
  openMembers: [];
  leave: [];
  openSearch: [];
}>();

const listRef = ref<HTMLElement | null>(null);

/** 把父组件的 draft 桥接为可写 ref，供提及/引用状态机直接读写 */
const draftRef = computed({
  get: () => props.draft,
  set: (value: string) => emit('update:draft', value),
});
const compose = useChatCompose(draftRef);

watch(
  () => props.members,
  (list) => compose.setMembers(list, props.selfId ?? undefined),
  { immediate: true },
);

/** 消息是否 @ 了当前用户，命中时气泡高亮 */
function mentionedMe(message: ChatMessage): boolean {
  return Boolean(props.selfId && message.mentions?.includes(props.selfId));
}

/** 所有发送者文案只信任当前成员清单，不展示登录名、历史快照或用户 ID。 */
function memberNameOf(senderId: string): string {
  return resolveChatMemberName(props.members, senderId);
}

function senderNameOf(message: ChatMessage): string {
  return memberNameOf(message.senderId);
}

function senderInitialOf(message: ChatMessage): string {
  return senderNameOf(message).slice(0, 1).toUpperCase();
}

/** 发送：带上有效提及与引用 id，发完清空引用状态 */
function handleSend(): void {
  emit('send', {
    mentions: compose.collectMentions(props.draft),
    replyToId: compose.replyTarget.value?.id,
  });
  compose.clearAfterSend();
}

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
        <div class="im-chat__actions">
          <el-button
            :icon="Search"
            @click="emit('openSearch')"
          >
            搜索记录
          </el-button>
          <el-button
            v-if="canManage && active.type === ConversationType.Group"
            :icon="EditPen"
            @click="emit('rename')"
          >
            改名
          </el-button>
          <el-button
            v-if="active.type === ConversationType.Group"
            :icon="User"
            @click="emit('openMembers')"
          >
            成员
          </el-button>
          <el-button
            v-if="active.type === ConversationType.Group"
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
                {{ senderInitialOf(message) }}
              </span>
              <div class="im-message__content">
                <div class="im-message__meta">
                  <span>{{ senderNameOf(message) }}</span>
                  <span>{{ messageTypeLabel(message.type) }}</span>
                  <time>{{ formatImTime(message.createdAt) }}</time>
                  <el-button
                    text
                    size="small"
                    class="im-message__quote"
                    :icon="ChatLineSquare"
                    aria-label="引用回复"
                    @click="compose.setReply(message)"
                  />
                </div>
                <div
                  v-if="message.replyTo"
                  class="im-reply-quote"
                >
                  <span class="im-reply-quote__sender">
                    {{ memberNameOf(message.replyTo.senderId) }}
                  </span>
                  <span class="im-reply-quote__content">
                    {{ replyContentText(message.replyTo.type, message.replyTo.content) }}
                  </span>
                </div>
                <div
                  v-if="message.type === MessageType.Text"
                  :class="['im-bubble', { 'is-mentioned': mentionedMe(message) }]"
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
        <div
          v-if="compose.mentionQuery.value !== null"
          class="im-mention-picker"
        >
          <p
            v-if="compose.mentionCandidates.value.length === 0"
            class="im-mention-picker__empty"
          >
            无匹配成员
          </p>
          <button
            v-for="member in compose.mentionCandidates.value"
            :key="member.userId"
            class="im-mention-picker__item"
            @click="compose.pickMention(member)"
          >
            @{{ member.displayName }}
          </button>
        </div>
        <div
          v-if="compose.replyTarget.value"
          class="im-reply-quote is-composing"
        >
          <span class="im-reply-quote__sender">{{ senderNameOf(compose.replyTarget.value) }}</span>
          <span class="im-reply-quote__content">
            {{ replyContentText(compose.replyTarget.value.type, compose.replyTarget.value.content) }}
          </span>
          <el-button
            text
            size="small"
            :icon="CloseBold"
            aria-label="取消引用"
            @click="compose.clearAfterSend()"
          />
        </div>
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
            @keydown.enter.exact.prevent="handleSend"
          />
          <div class="im-composer__footer">
            <el-button
              type="primary"
              :icon="Promotion"
              @click="handleSend"
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
