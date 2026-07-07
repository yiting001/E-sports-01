import { computed, ref, type Ref } from 'vue';
import {
  MessageType,
  type ChatMessage,
  type ConversationMemberView,
} from '@app/contracts';

/** 输入框末尾的 @提及触发模式：@ 后跟不含空白的检索词 */
const MENTION_TRIGGER = /@([^\s@]*)$/;

/** 引用摘要文案：媒体消息显占位，文本原样返回 */
export function replyContentText(type: MessageType, content: string): string {
  if (type === MessageType.Image) {
    return '[图片]';
  }
  if (type === MessageType.Video) {
    return '[视频]';
  }
  return content;
}

/**
 * 聊天输入的 @提及与引用回复状态管理。
 * - 提及：输入 @ 触发成员候选面板，选中后插入 @用户名，发送时回收仍存在于文本中的提及 id；
 * - 引用：记录被引用消息并生成发送载荷字段，发送后清空。
 * C 端与管理端聊天面板共享同一交互模型，此组合式函数收敛全部纯状态逻辑。
 */
export function useChatCompose(draft: Ref<string>) {
  /** 当前会话可 @ 的成员（由外部在进入会话后注入） */
  const members = ref<ConversationMemberView[]>([]);
  /** 已选择的提及（发送前校验文本中仍保留 @用户名 才计入） */
  const picked = ref<{ id: string; username: string }[]>([]);
  /** 引用回复的目标消息 */
  const replyTarget = ref<ChatMessage | null>(null);

  /** @ 检索词：输入框末尾处于 @xxx 状态时为 xxx，否则为 null（不展示面板） */
  const mentionQuery = computed<string | null>(() => {
    const match = MENTION_TRIGGER.exec(draft.value);
    return match ? match[1] : null;
  });

  /** 按检索词过滤后的候选成员 */
  const mentionCandidates = computed<ConversationMemberView[]>(() => {
    if (mentionQuery.value === null) {
      return [];
    }
    const query = mentionQuery.value.toLowerCase();
    return members.value.filter((m) =>
      m.username.toLowerCase().includes(query),
    );
  });

  function setMembers(list: ConversationMemberView[], selfId?: string): void {
    members.value = list.filter((m) => m.userId !== selfId);
    picked.value = [];
    replyTarget.value = null;
  }

  /** 选中候选成员：把末尾的 @检索词 替换为 @用户名 并记录 */
  function pickMention(member: ConversationMemberView): void {
    draft.value = draft.value.replace(
      MENTION_TRIGGER,
      `@${member.username} `,
    );
    if (!picked.value.some((p) => p.id === member.userId)) {
      picked.value.push({ id: member.userId, username: member.username });
    }
  }

  /** 发送时计算有效提及：仅统计文本中仍保留 @用户名 的记录 */
  function collectMentions(content: string): string[] | undefined {
    const ids = picked.value
      .filter((p) => content.includes(`@${p.username}`))
      .map((p) => p.id);
    return ids.length > 0 ? ids : undefined;
  }

  function setReply(message: ChatMessage): void {
    replyTarget.value = message;
  }

  function clearAfterSend(): void {
    picked.value = [];
    replyTarget.value = null;
  }

  return {
    members,
    replyTarget,
    mentionQuery,
    mentionCandidates,
    setMembers,
    pickMention,
    collectMentions,
    setReply,
    clearAfterSend,
  };
}
