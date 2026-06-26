import type {
  AddMembersPayload,
  AssignAgentPayload,
  ChatMessage,
  ConversationDetailView,
  ConversationView,
  CreateGroupPayload,
  RenameGroupPayload,
  ServiceQueueItemView,
  StartServicePayload,
} from '@app/contracts';
import { http } from './http';

/**
 * IM REST 接口集合。
 * 历史消息与实时收发走 WebSocket，会话/群/客服的管理操作走 REST，
 * 与后端「一个路由一个文件」的控制器一一对应。
 */
export const imApi = {
  history(conversationId: string): Promise<ChatMessage[]> {
    return http.get('/im/messages', { params: { conversationId } });
  },

  listConversations(): Promise<ConversationView[]> {
    return http.get('/im/conversations');
  },

  conversationDetail(id: string): Promise<ConversationDetailView> {
    return http.get(`/im/conversations/${id}`);
  },

  createGroup(payload: CreateGroupPayload): Promise<ConversationView> {
    return http.post('/im/conversations', payload);
  },

  openPrivate(peerId: string): Promise<ConversationView> {
    return http.post('/im/conversations/private', { peerId });
  },

  rename(id: string, payload: RenameGroupPayload): Promise<ConversationView> {
    return http.put(`/im/conversations/${id}`, payload);
  },

  addMembers(
    id: string,
    payload: AddMembersPayload,
  ): Promise<ConversationDetailView> {
    return http.post(`/im/conversations/${id}/members`, payload);
  },

  removeMember(id: string, userId: string): Promise<void> {
    return http.delete(`/im/conversations/${id}/members/${userId}`);
  },

  leave(id: string): Promise<void> {
    return http.post(`/im/conversations/${id}/leave`);
  },

  startService(payload: StartServicePayload): Promise<ConversationView> {
    return http.post('/im/service', payload);
  },

  serviceQueue(): Promise<ServiceQueueItemView[]> {
    return http.get('/im/service/queue');
  },

  claimService(id: string): Promise<ConversationView> {
    return http.post(`/im/service/${id}/claim`);
  },

  assignService(id: string, payload: AssignAgentPayload): Promise<ConversationView> {
    return http.post(`/im/service/${id}/assign`, payload);
  },

  closeService(id: string): Promise<void> {
    return http.post(`/im/service/${id}/close`);
  },
};
