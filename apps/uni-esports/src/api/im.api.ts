import type {
  ConversationDetailView,
  ConversationView,
  StartServicePayload,
} from '@app/contracts';
import { http } from './http';

/**
 * C 端 IM REST 接口。
 * 用户仅需「联系客服」：复用进行中的客服会话，否则新发起；
 * 历史消息与实时收发走 WebSocket（见 src/im/im-socket.ts）。
 */
export const imApi = {
  /** 我的会话列表（含客服会话，用于复用进行中的客服会话，避免重复发起） */
  listConversations(options = { silent: false }): Promise<ConversationView[]> {
    return http.get('/im/conversations', options);
  },

  /** 会话详情（含成员清单） */
  conversationDetail(id: string): Promise<ConversationDetailView> {
    return http.get(`/im/conversations/${id}`);
  },

  /** 发起客服会话，进入待接入队列，返回会话视图 */
  startService(payload: StartServicePayload = {}): Promise<ConversationView> {
    return http.post('/im/service', payload);
  },
};
