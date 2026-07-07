import { Injectable } from '@nestjs/common';
import { ConversationView } from '@app/contracts';
import { ListConversationsUseCase } from './list-conversations.usecase';

/**
 * 用例：搜索我参与的会话。
 * 复用会话列表用例（标题已按查看者视角解析，私聊即对方用户名），
 * 在其结果上按关键词过滤，保持排序与视图口径一致。
 */
@Injectable()
export class SearchConversationsUseCase {
  constructor(private readonly list: ListConversationsUseCase) {}

  async execute(
    userId: string,
    keyword: string,
  ): Promise<ConversationView[]> {
    const views = await this.list.execute(userId);
    const needle = keyword.trim().toLowerCase();
    if (!needle) {
      return views;
    }
    return views.filter((v) => v.title.toLowerCase().includes(needle));
  }
}
