import type { ChatMessage } from '@app/contracts';

export interface VisibleMessageReadOptions {
  activeConversationId: () => string;
  latestMessage: () => ChatMessage | undefined;
  markRead: (conversationId: string, messageId: string) => Promise<boolean>;
  onMarked: () => void;
}

/**
 * 活动会话已读确认器。
 * 只在页面可见且消息属于当前会话时提交游标；恢复可见后补交最后一条消息。
 */
export function createVisibleMessageRead(options: VisibleMessageReadOptions) {
  let listening = false;

  async function confirm(message = options.latestMessage()): Promise<boolean> {
    if (
      !message ||
      document.visibilityState !== 'visible' ||
      message.conversationId !== options.activeConversationId()
    ) {
      return false;
    }
    const marked = await options.markRead(message.conversationId, message.id);
    if (marked) {
      options.onMarked();
    }
    return marked;
  }

  function onVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      void confirm();
    }
  }

  function start(): void {
    if (listening) {
      return;
    }
    listening = true;
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  function dispose(): void {
    if (!listening) {
      return;
    }
    listening = false;
    document.removeEventListener('visibilitychange', onVisibilityChange);
  }

  return { confirm, dispose, start };
}
