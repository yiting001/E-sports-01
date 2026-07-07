import { Inject, Injectable } from '@nestjs/common';
import { ChatMessage, PaginatedResult } from '@app/contracts';
import {
  MESSAGE_REPOSITORY,
  MessageRepository,
} from '../../domain/message-repository.interface';
import { ConversationAccessService } from '../conversation-access.service';
import { toChatMessage } from '../message.mapper';

/** 搜索入参（关键词与日期范围均可选，日期为当天零点/次日前一毫秒的闭区间） */
export interface SearchMessagesInput {
  conversationId: string;
  keyword?: string;
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
  skip: number;
}

/** 用例：搜索会话内聊天记录（仅会话成员可搜，按时间新→旧分页） */
@Injectable()
export class SearchMessagesUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly repo: MessageRepository,
    private readonly access: ConversationAccessService,
  ) {}

  async execute(
    userId: string,
    input: SearchMessagesInput,
  ): Promise<PaginatedResult<ChatMessage>> {
    await this.access.assertMember(input.conversationId, userId);
    const { rows, total } = await this.repo.search({
      conversationId: input.conversationId,
      keyword: input.keyword,
      from: input.from,
      to: input.to,
      skip: input.skip,
      take: input.pageSize,
    });
    return {
      list: rows.map(toChatMessage),
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  }
}
