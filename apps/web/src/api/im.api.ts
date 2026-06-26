import type { ChatMessage } from '@app/contracts';
import { http } from './http';

/** IM 历史消息接口（首屏加载会话历史，实时收发走 WebSocket） */
export const imApi = {
  history(conversationId: string): Promise<ChatMessage[]> {
    return http.get('/im/messages', { params: { conversationId } });
  },
};
