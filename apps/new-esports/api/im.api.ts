import type {
  ChatMessage,
  ConversationDetailView,
  ConversationView,
  PaginatedResult,
} from '@app/contracts';
import { http } from './http';

/**
 * IM 只读/会话管理接口（实时收发走 im-socket 的 WebSocket 通道）。
 * 会话列表与历史消息用于列表页与聊天页首屏；关键字搜索用于聊天记录检索。
 */
export const imApi = {
  /** 我的会话列表（按最后消息时间倒序，含未读数） */
  listConversations(): Promise<ConversationView[]> {
    return http.get('/im/conversations');
  },

  /** 会话详情（含成员清单：展示发送者昵称与身份标签） */
  conversationDetail(id: string): Promise<ConversationDetailView> {
    return http.get(`/im/conversations/${id}`, { silent: true });
  },

  /** 会话内消息检索（分页，关键字与日期区间可选） */
  searchMessages(
    conversationId: string,
    params: { page: number; pageSize: number; keyword?: string; dateFrom?: string; dateTo?: string },
  ): Promise<PaginatedResult<ChatMessage>> {
    return http.get('/im/messages/search', { params: { conversationId, ...params } });
  },

  /** 发起客服会话（每次新建一个待接入会话，随后由坐席认领） */
  startService(subject?: string): Promise<ConversationView> {
    return http.post('/im/service', subject ? { subject } : {});
  },
};
