import { ConversationMemberRole, type ConversationMemberView } from '@app/contracts';
import { ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { resolveChatMemberName, useChatCompose } from './use-chat-compose';

function member(displayName = '用户0942'): ConversationMemberView {
  return {
    userId: 'booster-1',
    displayName,
    role: ConversationMemberRole.Member,
    tag: '',
    joinedAt: 0,
    lastReadAt: null,
  };
}

describe('useChatCompose', () => {
  it('按成员安全展示名检索和插入提及，不使用登录用户名', () => {
    const draft = ref('@用户');
    const target = member();
    const compose = useChatCompose(draft);

    compose.setMembers([target]);
    expect(compose.mentionCandidates.value).toEqual([target]);

    compose.pickMention(target);

    expect(draft.value).toBe('@用户0942 ');
    expect(compose.collectMentions(draft.value)).toEqual(['booster-1']);
    expect(draft.value).not.toMatch(/1\d{10}|sms_/);
  });
});

describe('resolveChatMemberName', () => {
  it('使用成员安全展示名，不读取消息内的历史发送者快照', () => {
    expect(resolveChatMemberName([member()], 'booster-1')).toBe('用户0942');
  });

  it('成员不在当前清单或展示名为空时使用安全兜底', () => {
    expect(resolveChatMemberName([member()], 'missing-user')).toBe('成员');
    expect(resolveChatMemberName([member('  ')], 'booster-1')).toBe('成员');
  });
});
