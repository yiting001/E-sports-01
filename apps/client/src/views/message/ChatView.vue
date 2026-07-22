<script setup lang="ts">
/**
 * 会话聊天页（全屏）：按路由参数打开指定会话（订单群/群聊/客服均可），
 * 历史消息与实时收发复用 ServiceChatPanel。
 * 入口：订单详情「进入订单群」、消息页点击会话。
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { ConversationView } from '@app/contracts';
import ServiceChatPanel from '@/components/message/ServiceChatPanel.vue';
import { imApi } from '@/api/im.api';
import { useToast } from '@/composables/use-toast';
import { useConversationEventsStore } from '@/stores/conversation-events.store';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const conversationEvents = useConversationEventsStore();

const conversation = ref<ConversationView | null>(null);
const loading = ref(true);
let appliedRevision = conversationEvents.revision;

onMounted(async () => {
  const revisionBeforeLoad = conversationEvents.revision;
  try {
    const list = await imApi.listConversations();
    const conversationId = String(route.params.id);
    const target = list.find((item) => item.id === conversationId);
    if (!target) {
      toast.show('会话不存在或你不在该会话中');
      router.back();
      return;
    }
    const realtime = conversationEvents
      .updatesSince(revisionBeforeLoad)
      .find((item) => item.id === conversationId);
    conversation.value = realtime && realtime.version >= target.version ? realtime : target;
  } finally {
    loading.value = false;
  }
});

const stopConversationWatch = watch(
  () => conversationEvents.revision,
  () => {
    for (const updated of conversationEvents.updatesSince(appliedRevision)) {
      const current = conversation.value;
      if (
        updated.id === current?.id &&
        updated.version >= current.version
      ) {
        conversation.value = updated;
      }
    }
    appliedRevision = conversationEvents.revision;
  },
);

onBeforeUnmount(stopConversationWatch);
</script>

<template>
  <ServiceChatPanel
    v-if="!loading"
    :conversation="conversation"
    :auto-start="false"
    :show-back="true"
    empty-text="会话加载失败"
    @back="router.back()"
  />
</template>
