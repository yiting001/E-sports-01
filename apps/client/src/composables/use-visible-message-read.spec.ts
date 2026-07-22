import type { ChatMessage } from '@app/contracts';
import { MessageType } from '@app/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createVisibleMessageRead } from './use-visible-message-read';

function message(conversationId = 'conversation-1'): ChatMessage {
  return {
    id: 'message-1',
    conversationId,
    senderId: 'user-2',
    type: MessageType.Text,
    content: '新消息',
    mentions: null,
    replyTo: null,
    createdAt: 1,
  };
}

function stubDocument(visibilityState: 'hidden' | 'visible') {
  const listeners = new Map<string, EventListener>();
  vi.stubGlobal('document', {
    visibilityState,
    addEventListener: vi.fn((event: string, listener: EventListener) => {
      listeners.set(event, listener);
    }),
    removeEventListener: vi.fn((event: string) => {
      listeners.delete(event);
    }),
  });
  return listeners;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createVisibleMessageRead', () => {
  it('页面隐藏或消息不属于当前会话时不提交已读', async () => {
    stubDocument('hidden');
    const markRead = vi.fn().mockResolvedValue(true);
    const tracker = createVisibleMessageRead({
      activeConversationId: () => 'conversation-1',
      latestMessage: () => message(),
      markRead,
      onMarked: vi.fn(),
    });

    await expect(tracker.confirm(message())).resolves.toBe(false);
    expect(markRead).not.toHaveBeenCalled();
  });

  it('页面可见且服务端确认成功后通知刷新角标', async () => {
    stubDocument('visible');
    const markRead = vi.fn().mockResolvedValue(true);
    const onMarked = vi.fn();
    const tracker = createVisibleMessageRead({
      activeConversationId: () => 'conversation-1',
      latestMessage: () => message(),
      markRead,
      onMarked,
    });

    await expect(tracker.confirm(message())).resolves.toBe(true);
    expect(markRead).toHaveBeenCalledWith('conversation-1', 'message-1');
    expect(onMarked).toHaveBeenCalledTimes(1);
  });

  it('恢复可见时补交最后一条消息，销毁后移除监听', async () => {
    const listeners = stubDocument('visible');
    const markRead = vi.fn().mockResolvedValue(true);
    const tracker = createVisibleMessageRead({
      activeConversationId: () => 'conversation-1',
      latestMessage: () => message(),
      markRead,
      onMarked: vi.fn(),
    });
    tracker.start();
    tracker.start();

    listeners.get('visibilitychange')?.(new Event('visibilitychange'));
    await Promise.resolve();
    expect(markRead).toHaveBeenCalledTimes(1);

    tracker.dispose();
    expect(listeners.has('visibilitychange')).toBe(false);
  });
});
