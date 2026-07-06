<script setup lang="ts">
/**
 * 会话聊天页（全屏）：按路由参数打开指定会话（订单群/群聊/客服均可），
 * 历史消息与实时收发复用 ServiceChatPanel。
 * 入口：订单详情「进入订单群」、消息页点击会话。
 */
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { ConversationView } from '@app/contracts';
import ServiceChatPanel from '@/components/message/ServiceChatPanel.vue';
import { imApi } from '@/api/im.api';
import { useToast } from '@/composables/use-toast';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const conversation = ref<ConversationView | null>(null);
const loading = ref(true);

onMounted(async () => {
  try {
    const list = await imApi.listConversations();
    const target = list.find((item) => item.id === route.params.id);
    if (!target) {
      toast.show('会话不存在或你不在该会话中');
      router.back();
      return;
    }
    conversation.value = target;
  } finally {
    loading.value = false;
  }
});
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
