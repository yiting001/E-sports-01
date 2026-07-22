import type { ConversationView } from '@app/contracts';
import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';

interface ConversationUpdate {
  revision: number;
  conversation: ConversationView;
}

/** 将全局个人房间收到的权威会话视图分发给当前页面。 */
export const useConversationEventsStore = defineStore('conversation-events', () => {
  const latest = shallowRef<ConversationView | null>(null);
  const updatesByConversation = shallowRef<Record<string, ConversationUpdate>>({});
  const revision = ref(0);

  function publish(conversation: ConversationView): void {
    const view = { ...conversation };
    const current = updatesByConversation.value[view.id];
    if (current && view.version < current.conversation.version) {
      return;
    }
    const nextRevision = revision.value + 1;
    latest.value = view;
    revision.value = nextRevision;
    updatesByConversation.value = {
      ...updatesByConversation.value,
      [view.id]: { revision: nextRevision, conversation: view },
    };
  }

  /** 返回指定修订之后每个会话的最新视图，供列表请求完成后消除竞态。 */
  function updatesSince(revisionExclusive: number): ConversationView[] {
    return Object.values(updatesByConversation.value)
      .filter((update) => update.revision > revisionExclusive)
      .sort((left, right) => left.revision - right.revision)
      .map((update) => update.conversation);
  }

  function clear(): void {
    latest.value = null;
    updatesByConversation.value = {};
  }

  return { latest, revision, publish, updatesSince, clear };
});
