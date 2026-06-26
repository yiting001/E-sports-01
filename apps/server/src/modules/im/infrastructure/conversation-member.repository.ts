import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationMemberEntity } from '../domain/conversation-member.entity';
import { ConversationMemberRepository } from '../domain/conversation-member-repository.interface';

/** 会话成员仓储的 TypeORM 实现 */
@Injectable()
export class TypeormConversationMemberRepository
  implements ConversationMemberRepository
{
  constructor(
    @InjectRepository(ConversationMemberEntity)
    private readonly repo: Repository<ConversationMemberEntity>,
  ) {}

  saveMany(
    members: ConversationMemberEntity[],
  ): Promise<ConversationMemberEntity[]> {
    return this.repo.save(members);
  }

  findByConversation(
    conversationId: string,
  ): Promise<ConversationMemberEntity[]> {
    return this.repo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
  }

  findByUser(userId: string): Promise<ConversationMemberEntity[]> {
    return this.repo.find({ where: { userId } });
  }

  findOne(
    conversationId: string,
    userId: string,
  ): Promise<ConversationMemberEntity | null> {
    return this.repo.findOne({ where: { conversationId, userId } });
  }

  countByConversation(conversationId: string): Promise<number> {
    return this.repo.countBy({ conversationId });
  }

  async remove(conversationId: string, userId: string): Promise<void> {
    await this.repo.delete({ conversationId, userId });
  }

  async updateLastRead(
    conversationId: string,
    userId: string,
    at: Date,
  ): Promise<void> {
    await this.repo.update({ conversationId, userId }, { lastReadAt: at });
  }
}
