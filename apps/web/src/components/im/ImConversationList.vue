<script setup lang="ts">
import type { ConversationView } from '@app/contracts';
import { ChatDotRound, Headset, Plus } from '@element-plus/icons-vue';
import {
  conversationInitial,
  conversationTypeLabel,
  conversationTypeTone,
  formatImTime,
  messagePreview,
  statusLabel,
  statusTone,
} from './im-ui';

defineProps<{
  conversations: ConversationView[];
  activeId: string | null;
  canCreateGroup: boolean;
}>();

const emit = defineEmits<{
  createGroup: [];
  startService: [];
  select: [id: string];
}>();
</script>

<template>
  <aside class="im-sidebar">
    <div class="im-sidebar__head">
      <div>
        <h2>即时通讯</h2>
        <small>{{ conversations.length }} 个会话</small>
      </div>
    </div>

    <div class="im-sidebar__actions">
      <el-button
        v-if="canCreateGroup"
        type="primary"
        :icon="Plus"
        @click="emit('createGroup')"
      >
        建群
      </el-button>
      <el-button
        :icon="Headset"
        @click="emit('startService')"
      >
        联系客服
      </el-button>
    </div>

    <el-scrollbar class="im-conversation-list">
      <button
        v-for="conversation in conversations"
        :key="conversation.id"
        type="button"
        :class="['im-conversation', { 'is-active': conversation.id === activeId }]"
        @click="emit('select', conversation.id)"
      >
        <span :class="['im-avatar', `is-${conversationTypeTone(conversation.type)}`]">
          {{ conversationInitial(conversation.title) }}
        </span>
        <span class="im-conversation__body">
          <span class="im-conversation__top">
            <strong>{{ conversation.title }}</strong>
            <time>{{ formatImTime(conversation.updatedAt) }}</time>
          </span>
          <span class="im-conversation__meta">
            <span :class="['im-type', `is-${conversationTypeTone(conversation.type)}`]">
              {{ conversationTypeLabel(conversation.type) }}
            </span>
            <span :class="['im-dot-status', `is-${statusTone(conversation.status)}`]">
              {{ statusLabel(conversation.status) }}
            </span>
          </span>
          <span class="im-conversation__preview">
            {{ messagePreview(conversation.lastMessage) }}
          </span>
        </span>
        <el-badge
          v-if="conversation.unread > 0"
          :value="conversation.unread"
          class="im-unread"
        />
      </button>
      <el-empty
        v-if="conversations.length === 0"
        :image-size="96"
        description="暂无会话"
      >
        <el-button
          type="primary"
          :icon="ChatDotRound"
          @click="emit('startService')"
        >
          发起咨询
        </el-button>
      </el-empty>
    </el-scrollbar>
  </aside>
</template>
