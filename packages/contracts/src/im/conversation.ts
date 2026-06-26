import { ChatMessage, ConversationType } from './message';

/** 成员在会话中的角色：群主 / 管理员 / 普通成员 / 客服坐席 */
export enum ConversationMemberRole {
  Owner = 'owner',
  Admin = 'admin',
  Member = 'member',
  Agent = 'agent',
}

/**
 * 会话状态。
 * 群聊恒为 active；客服会话走 pending（待接入）→ active（坐席接入）→ closed（结束）。
 */
export enum ConversationStatus {
  Active = 'active',
  Pending = 'pending',
  Closed = 'closed',
}

/** 会话成员对外结构 */
export interface ConversationMemberView {
  userId: string;
  username: string;
  role: ConversationMemberRole;
  joinedAt: number;
  lastReadAt: number | null;
}

/** 会话列表项（含未读数与最后一条消息，供会话列表渲染） */
export interface ConversationView {
  id: string;
  type: ConversationType;
  title: string;
  ownerId: string | null;
  status: ConversationStatus;
  memberCount: number;
  lastMessage: ChatMessage | null;
  unread: number;
  createdAt: number;
  updatedAt: number;
}

/** 会话详情（含成员清单） */
export interface ConversationDetailView extends ConversationView {
  members: ConversationMemberView[];
}

/** 建群载荷 */
export interface CreateGroupPayload {
  title: string;
  memberIds: string[];
}

/** 群改名载荷 */
export interface RenameGroupPayload {
  title: string;
}

/** 加成员载荷 */
export interface AddMembersPayload {
  userIds: string[];
}

/** 访客发起客服会话的载荷 */
export interface StartServicePayload {
  /** 咨询主题，可空 */
  subject?: string;
}

/** 客服队列项（坐席视角的待接入会话） */
export interface ServiceQueueItemView {
  conversationId: string;
  visitorId: string;
  visitorName: string;
  subject: string;
  waitingSince: number;
}

/** 指派坐席载荷 */
export interface AssignAgentPayload {
  agentId: string;
}
