<script setup lang="ts">
/**
 * @成员候选面板：输入 @ 时悬浮于输入区上方，点选后向父组件回传成员。
 */
import type { ConversationMemberView } from '@app/contracts';

defineProps<{ candidates: ConversationMemberView[] }>();

const emit = defineEmits<{ pick: [member: ConversationMemberView] }>();
</script>

<template>
  <div class="mention-picker">
    <p
      v-if="candidates.length === 0"
      class="mention-picker__empty"
    >
      无匹配成员
    </p>
    <button
      v-for="member in candidates"
      :key="member.userId"
      class="mention-picker__item"
      @click="emit('pick', member)"
    >
      <span class="mention-picker__avatar">
        {{ member.username.slice(0, 1).toUpperCase() }}
      </span>
      <span class="mention-picker__name">{{ member.username }}</span>
    </button>
  </div>
</template>
