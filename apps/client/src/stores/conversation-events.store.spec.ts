import {
  ConversationMemberRole,
  ConversationStatus,
  ConversationType,
  type ConversationView,
} from '@app/contracts';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick, watch } from 'vue';
import { beforeEach, describe, expect, it } from 'vitest';
import { useConversationEventsStore } from './conversation-events.store';

function createConversation(
  title: string,
  id = 'conversation-1',
  version = 1,
): ConversationView {
  return {
    id,
    version,
    type: ConversationType.Group,
    viewerRole: ConversationMemberRole.Member,
    title,
    ownerId: 'owner-1',
    status: ConversationStatus.Active,
    memberCount: 3,
    lastMessage: null,
    unread: 0,
    createdAt: 1,
    updatedAt: 2,
  };
}

describe('conversationEvents store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('发布并清理服务端权威会话视图', () => {
    const store = useConversationEventsStore();
    const conversation = createConversation('[服务中] 订单群·陪玩服务');

    store.publish(conversation);

    expect(store.latest).toEqual(conversation);
    expect(store.latest).not.toBe(conversation);
    expect(store.revision).toBe(1);

    store.clear();
    expect(store.latest).toBeNull();
    expect(store.revision).toBe(1);
  });

  it('列表请求期间保留每个会话的最新更新', () => {
    const store = useConversationEventsStore();
    const beforeLoad = store.revision;

    store.publish(createConversation('[服务中] 订单群·一号', 'conversation-1'));
    store.publish(createConversation('[待接单] 订单群·二号', 'conversation-2'));
    store.publish(createConversation('[已结束] 订单群·一号', 'conversation-1'));

    expect(store.updatesSince(beforeLoad).map((item) => item.title)).toEqual([
      '[待接单] 订单群·二号',
      '[已结束] 订单群·一号',
    ]);
    expect(store.updatesSince(store.revision)).toEqual([]);
  });

  it('拒绝逆序到达的旧会话版本，避免已结束标题倒退', () => {
    const store = useConversationEventsStore();

    store.publish(createConversation('[已结束] 订单群·陪玩服务', 'conversation-1', 3));
    store.publish(createConversation('[服务中] 订单群·陪玩服务', 'conversation-1', 2));

    expect(store.latest?.title).toBe('[已结束] 订单群·陪玩服务');
    expect(store.revision).toBe(1);
  });

  it('修订监听可在同一 tick 批量消费多个会话更新', async () => {
    const store = useConversationEventsStore();
    const consumed: string[] = [];
    let appliedRevision = store.revision;
    const stop = watch(
      () => store.revision,
      () => {
        consumed.push(...store.updatesSince(appliedRevision).map((item) => item.id));
        appliedRevision = store.revision;
      },
    );

    store.publish(createConversation('[服务中] 订单群·一号', 'conversation-1'));
    store.publish(createConversation('[待接单] 订单群·二号', 'conversation-2'));
    await nextTick();

    expect(consumed).toEqual(['conversation-1', 'conversation-2']);
    stop();
  });
});
