import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ConversationStatus, ConversationType } from '@app/contracts';
import { ConversationEntity } from '../domain/conversation.entity';
import { ConversationRepository } from '../domain/conversation-repository.interface';

/** 会话仓储的 TypeORM 实现 */
@Injectable()
export class TypeormConversationRepository implements ConversationRepository {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly repo: Repository<ConversationEntity>,
  ) {}

  save(conversation: ConversationEntity): Promise<ConversationEntity> {
    return this.repo.save(conversation);
  }

  findById(id: string): Promise<ConversationEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByIds(ids: string[]): Promise<ConversationEntity[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.repo.find({ where: { id: In(ids) } });
  }

  findWaitingService(): Promise<ConversationEntity[]> {
    return this.repo.find({
      where: {
        type: ConversationType.Service,
        status: ConversationStatus.Pending,
      },
      order: { createdAt: 'ASC' },
    });
  }
}
