<script setup lang="ts">
import { computed } from 'vue';
import {
  ConversationStatus,
  ConversationType,
  type ConversationView,
} from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';

const props = defineProps<{
  conversation: ConversationView | null;
  showBack: boolean;
}>();

const emit = defineEmits<{ back: [] }>();

const title = computed(() => props.conversation?.title || '三角洲客服');

const status = computed(() => {
  if (!props.conversation) {
    return '等待选择会话';
  }
  if (props.conversation.type === ConversationType.Group) {
    return '群聊会话';
  }
  switch (props.conversation.status) {
    case ConversationStatus.Active:
      return '客服服务中';
    case ConversationStatus.Closed:
      return '会话已结束';
    default:
      return '正在为你接入客服…';
  }
});
</script>

<template>
  <header class="bar">
    <div class="bar-inner">
      <button
        v-if="showBack"
        class="back"
        aria-label="返回"
        @click="emit('back')"
      >
        <AppIcon
          name="chevron"
          :size="20"
        />
      </button>
      <div class="bar-title">
        <span class="name">{{ title }}</span>
        <span class="status">{{ status }}</span>
      </div>
    </div>
  </header>
</template>
