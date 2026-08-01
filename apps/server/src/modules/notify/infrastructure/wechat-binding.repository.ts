import { Injectable } from '@nestjs/common';
import { NotifyWechatChannel } from '@app/contracts';
import type { FindOptionsWhere } from 'typeorm';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { WechatBindingEntity } from '../domain/wechat-binding.entity';
import { WechatBindingRepository } from '../domain/wechat-binding-repository.interface';

/** 微信绑定仓储的 TypeORM 实现，读写均在当前租户上下文内 */
@Injectable()
export class TypeormWechatBindingRepository implements WechatBindingRepository {
  constructor(
    @InjectRepository(WechatBindingEntity)
    private readonly repo: Repository<WechatBindingEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  findByUser(userId: string): Promise<WechatBindingEntity[]> {
    return this.repo.find({
      where: withTenant<WechatBindingEntity>(this.tenant, { userId }),
      order: { channel: 'ASC' },
    });
  }

  findByUsers(
    userIds: string[],
    channel: NotifyWechatChannel,
  ): Promise<WechatBindingEntity[]> {
    if (userIds.length === 0) {
      return Promise.resolve([]);
    }
    const where: FindOptionsWhere<WechatBindingEntity> = {
      userId: In(userIds),
      channel,
    };
    return this.repo.find({ where: withTenant<WechatBindingEntity>(this.tenant, where) });
  }

  async upsert(
    userId: string,
    channel: NotifyWechatChannel,
    openid: string,
  ): Promise<WechatBindingEntity> {
    const existing = await this.findOneByUserChannel(userId, channel);
    if (existing) {
      existing.openid = openid;
      return this.repo.save(existing);
    }
    return this.repo.save(this.repo.create({ userId, channel, openid }));
  }

  async removeByUserChannel(userId: string, channel: NotifyWechatChannel): Promise<void> {
    const existing = await this.findOneByUserChannel(userId, channel);
    if (existing) {
      await this.repo.remove(existing);
    }
  }

  private findOneByUserChannel(
    userId: string,
    channel: NotifyWechatChannel,
  ): Promise<WechatBindingEntity | null> {
    return this.repo.findOne({
      where: withTenant<WechatBindingEntity>(this.tenant, {
        userId,
        channel,
      }) as FindOptionsWhere<WechatBindingEntity>,
    });
  }
}
