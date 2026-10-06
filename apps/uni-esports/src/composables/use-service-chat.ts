import { ConversationStatus, ConversationType } from '@app/contracts';
import { imApi } from '@/api/im.api';

/**
 * 进入在线客服会话：复用进行中的客服会话，否则新发起。
 * 与 apps/client 的 ServiceChatPanel.resolveConversation 同逻辑，
 * 供「我的」页客服入口调用（消息页本身只展示会话列表，与原版一致）。
 */
export async function openServiceChat(): Promise<void> {
  const list = await imApi.listConversations();
  const ongoing = list.find(
    (item) =>
      item.type === ConversationType.Service &&
      item.status !== ConversationStatus.Closed,
  );
  const conversation = ongoing ?? (await imApi.startService());
  uni.navigateTo({ url: `/pages/chat/chat?id=${conversation.id}` });
}
