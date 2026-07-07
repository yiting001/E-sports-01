<script setup lang="ts">
/**
 * 引用回复摘要块：展示被引用消息的发送者与内容摘要。
 * 用于消息气泡内（只读）与输入区上方（可取消）两处。
 */
import { computed } from 'vue';
import type { MessageType } from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import { replyContentText } from '@/composables/use-chat-compose';

const props = withDefaults(
  defineProps<{
    senderName: string;
    type: MessageType;
    content: string;
    /** 是否展示取消按钮（输入区引用预览用） */
    cancellable?: boolean;
  }>(),
  { cancellable: false },
);

const emit = defineEmits<{ cancel: [] }>();

/** 媒体消息在摘要中显示占位文案 */
const summary = computed(() => replyContentText(props.type, props.content));
</script>

<template>
  <div class="reply-quote">
    <div class="reply-quote__body">
      <span class="reply-quote__sender">{{ senderName }}</span>
      <span class="reply-quote__content">{{ summary }}</span>
    </div>
    <button
      v-if="cancellable"
      class="reply-quote__cancel"
      aria-label="取消引用"
      @click="emit('cancel')"
    >
      <AppIcon
        name="close"
        :size="14"
      />
    </button>
  </div>
</template>
