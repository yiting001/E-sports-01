import {
  ConversationStatus,
  ConversationType,
  MessageType,
  type ChatMessage,
} from '@app/contracts';

export interface ImOption<T> {
  label: string;
  value: T;
}

export const IM_MESSAGE_TYPE_OPTIONS: ImOption<MessageType>[] = [
  { label: '文字', value: MessageType.Text },
  { label: '图片', value: MessageType.Image },
  { label: '视频', value: MessageType.Video },
];

export const IM_CONVERSATION_META: Record<ConversationType, { label: string; tone: string }> = {
  [ConversationType.Private]: { label: '私聊', tone: 'private' },
  [ConversationType.Group]: { label: '群聊', tone: 'group' },
  [ConversationType.Service]: { label: '客服', tone: 'service' },
};

export const IM_STATUS_META: Record<ConversationStatus, { label: string; tone: string }> = {
  [ConversationStatus.Active]: { label: '进行中', tone: 'active' },
  [ConversationStatus.Pending]: { label: '待接入', tone: 'pending' },
  [ConversationStatus.Closed]: { label: '已结束', tone: 'closed' },
};

export const IM_MESSAGE_TYPE_LABEL: Record<MessageType, string> = {
  [MessageType.Text]: '文字',
  [MessageType.Image]: '图片',
  [MessageType.Video]: '视频',
  [MessageType.System]: '系统',
};

export function conversationInitial(title: string): string {
  const source = title.trim();
  return source ? source.slice(0, 2).toUpperCase() : 'IM';
}

export function conversationTypeLabel(type: ConversationType): string {
  return IM_CONVERSATION_META[type].label;
}

export function conversationTypeTone(type: ConversationType): string {
  return IM_CONVERSATION_META[type].tone;
}

export function statusLabel(status: ConversationStatus): string {
  return IM_STATUS_META[status].label;
}

export function statusTone(status: ConversationStatus): string {
  return IM_STATUS_META[status].tone;
}

export function messageTypeLabel(type: MessageType): string {
  return IM_MESSAGE_TYPE_LABEL[type];
}

export function messagePreview(message: ChatMessage | null): string {
  if (!message) {
    return '暂无消息';
  }
  if (message.type === MessageType.Image) {
    return '[图片]';
  }
  if (message.type === MessageType.Video) {
    return '[视频]';
  }
  if (message.type === MessageType.System) {
    return '系统通知';
  }
  return message.content;
}

export function formatImTime(value: number | null | undefined): string {
  if (!value) {
    return '-';
  }
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
