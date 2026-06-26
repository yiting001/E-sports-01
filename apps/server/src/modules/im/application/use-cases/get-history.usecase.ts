import { Inject, Injectable } from '@nestjs/common';
import { ChatMessage, CONFIG_KEYS } from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import {
  MESSAGE_REPOSITORY,
  MessageRepository,
} from '../../domain/message-repository.interface';
import { toChatMessage } from '../message.mapper';

/** 历史条数兜底值，正式取值来自配置中心 im.historyLimit */
const FALLBACK_LIMIT = 50;

/** 用例：按会话拉取最近的历史消息，条数由配置中心控制 */
@Injectable()
export class GetHistoryUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly repo: MessageRepository,
    private readonly config: ConfigService,
  ) {}

  async execute(conversationId: string): Promise<ChatMessage[]> {
    if (!conversationId) {
      return [];
    }
    const limit = await this.config.getNumber(
      CONFIG_KEYS.im.historyLimit,
      FALLBACK_LIMIT,
    );
    const rows = await this.repo.findRecent(conversationId, limit);
    return rows.map(toChatMessage);
  }
}
