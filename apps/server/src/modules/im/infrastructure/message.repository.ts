import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { ChatMessageEntity } from '../domain/message.entity';
import { MessageRepository } from '../domain/message-repository.interface';

/** 聊天消息仓储的 TypeORM 实现 */
@Injectable()
export class TypeormMessageRepository implements MessageRepository {
  constructor(
    @InjectRepository(ChatMessageEntity)
    private readonly repo: Repository<ChatMessageEntity>,
  ) {}

  save(message: ChatMessageEntity): Promise<ChatMessageEntity> {
    return this.repo.save(message);
  }

  async findRecent(
    conversationId: string,
    limit: number,
  ): Promise<ChatMessageEntity[]> {
    const rows = await this.repo.find({
      where: { conversationId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return rows.reverse();
  }

  findLatest(conversationId: string): Promise<ChatMessageEntity | null> {
    return this.repo.findOne({
      where: { conversationId },
      order: { createdAt: 'DESC' },
    });
  }

  countSince(conversationId: string, since: Date | null): Promise<number> {
    return this.repo.countBy({
      conversationId,
      ...(since ? { createdAt: MoreThan(since) } : {}),
    });
  }
}
