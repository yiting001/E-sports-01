import { computed, readonly, ref, watch } from 'vue';
import type { ChatMessage, ConversationView, SendMessagePayload } from '@app/contracts';
import { MessageType } from '@app/contracts';
import { imApi } from '@/api/im.api';
import { tokenStorage } from '@/api/token-storage';
import { createImSocket } from '@/im/im-socket';
import { toast } from '@/utils/toast';

/**
 * IM 状态（客服会话 + 订单群聊）。
 * 单一职责：维护 socket 连接、会话列表与未读汇总，并把实时消息转发给订阅页面。
 * 说明：本工程暂未接入 Pinia，用模块级响应式状态承担同等职责（与 stores/auth 等一致）。
 */

const conversationsRef = ref<ConversationView[]>([]);
const connectedRef = ref(false);

/** 未读汇总：服务端按查看者计算每会话未读数，客户端只做求和 */
const unreadTotal = computed(() =>
  conversationsRef.value.reduce((sum, item) => sum + (item.unread ?? 0), 0),
);

type MessageHandler = (message: ChatMessage) => void;
type ConversationHandler = (conversation: ConversationView) => void;

const messageHandlers = new Set<MessageHandler>();
const conversationHandlers = new Set<ConversationHandler>();

let socket: ReturnType<typeof createImSocket> | null = null;

/** 会话视图按服务端版本号合并，拒绝乱序旧视图 */
function upsertConversation(next: ConversationView): void {
  const list = conversationsRef.value;
  const index = list.findIndex((item) => item.id === next.id);
  if (index < 0) {
    conversationsRef.value = [next, ...list];
  } else {
    const current = list[index];
    if (next.version < current.version) {
      return;
    }
    const merged = [...list];
    merged[index] = next;
    // 有新消息的会话前置，保持与列表接口一致的排序语义
    merged.sort((a, b) => (b.lastMessage?.createdAt ?? b.updatedAt) - (a.lastMessage?.createdAt ?? a.updatedAt));
    conversationsRef.value = merged;
  }
  conversationHandlers.forEach((handler) => handler(next));
}

function removeConversation(id: string): void {
  conversationsRef.value = conversationsRef.value.filter((item) => item.id !== id);
}

/** 建立连接（需已登录；重复调用幂等） */
function ensureConnected(): void {
  if (!tokenStorage.getAccess() || socket) {
    return;
  }
  const client = createImSocket();
  socket = client;
  const activeSocket = client.connect();

  activeSocket.on('connect', () => {
    connectedRef.value = true;
    void loadConversations();
  });
  activeSocket.on('disconnect', () => {
    connectedRef.value = false;
  });
  client.onReceive((message) => {
    messageHandlers.forEach((handler) => handler(message));
  });
  client.onConversation((conversation) => {
    upsertConversation(conversation);
  });
  client.onUnreadChanged(() => {
    void loadConversations();
  });
  client.onError((error) => {
    toast(error.message || '消息连接异常');
  });
}

/** 断开并清空（登出时调用，避免换号后串会话） */
function disconnect(): void {
  socket?.disconnect();
  socket = null;
  connectedRef.value = false;
  conversationsRef.value = [];
}

/** 拉取会话列表（连接建立、未读变化与页面展示时调用） */
async function loadConversations(): Promise<void> {
  if (!tokenStorage.getAccess()) {
    conversationsRef.value = [];
    return;
  }
  try {
    conversationsRef.value = await imApi.listConversations();
  } catch {
    // 接口错误已统一提示；保留已有列表
  }
}

/** 进入会话房间，返回服务端回传的历史消息 */
async function joinConversation(conversationId: string): Promise<ChatMessage[]> {
  ensureConnected();
  if (!socket) {
    return [];
  }
  return socket.join(conversationId);
}

function sendMessage(payload: SendMessagePayload): void {
  socket?.send(payload);
}

/** 发送图片消息（先经自助上传拿到可访问 URL） */
function sendImage(conversationId: string, url: string): void {
  sendMessage({ conversationId, type: MessageType.Image, content: url });
}

/** 推进已读位点（页面展示到某条消息后调用） */
async function markRead(conversationId: string, messageId: string): Promise<void> {
  if (!socket) {
    return;
  }
  const marked = await socket.markRead(conversationId, messageId);
  if (marked) {
    const target = conversationsRef.value.find((item) => item.id === conversationId);
    if (target && target.unread > 0) {
      upsertConversation({ ...target, unread: 0 });
    }
  }
}

/** 发起客服会话（需要登录；成功后进入会话列表并返回会话） */
async function startServiceChat(subject?: string): Promise<ConversationView> {
  const conversation = await imApi.startService(subject);
  upsertConversation(conversation);
  return conversation;
}

function onMessage(handler: MessageHandler): () => void {
  messageHandlers.add(handler);
  return () => {
    messageHandlers.delete(handler);
  };
}

function onConversation(handler: ConversationHandler): () => void {
  conversationHandlers.add(handler);
  return () => {
    conversationHandlers.delete(handler);
  };
}

/**
 * 未读汇总同步到 tabBar 角标（消息 tab 位于 tabBar 第二位）。
 * 说明：H5 运行时的角标 API 在 tabBar 未就绪时调用会被丢弃，故除监听未读变化外，
 * 消息页 onShow 也会调用一次 syncTabBarBadge 兜底；mp-weixin 走原生 wx.setTabBarBadge。
 */
function syncTabBarBadge(): void {
  const total = unreadTotal.value;
  try {
    if (total > 0) {
      uni.setTabBarBadge({ index: 1, text: total > 99 ? '99+' : String(total) });
    } else {
      uni.removeTabBarBadge({ index: 1 });
    }
  } catch {
    // 非 tab 页或平台不支持角标时忽略
  }
}

watch(unreadTotal, syncTabBarBadge);

export const im = {
  conversations: readonly(conversationsRef),
  connected: readonly(connectedRef),
  unreadTotal,
  ensureConnected,
  disconnect,
  loadConversations,
  joinConversation,
  sendMessage,
  sendImage,
  markRead,
  startServiceChat,
  upsertConversation,
  removeConversation,
  syncTabBarBadge,
  onMessage,
  onConversation,
};
