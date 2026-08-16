import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WechatIdentityEntity } from '../domain/wechat-identity.entity';
import { WechatIdentityRepository } from '../domain/wechat-identity-repository.interface';

/** 微信公众号登录身份仓储的 TypeORM 实现（显式租户过滤，登录前无租户上下文） */
@Injectable()
export class TypeormWechatIdentityRepository implements WechatIdentityRepository {
  constructor(
    @InjectRepository(WechatIdentityEntity)
    private readonly repo: Repository<WechatIdentityEntity>,
  ) {}

  findByOpenid(openid: string, tenantId: string): Promise<WechatIdentityEntity | null> {
    return this.repo.findOne({ where: { openid, tenantId } });
  }

  findByUser(userId: string, tenantId: string): Promise<WechatIdentityEntity | null> {
    return this.repo.findOne({ where: { userId, tenantId } });
  }

  save(
    identity: Pick<WechatIdentityEntity, 'userId' | 'openid' | 'tenantId'>,
  ): Promise<WechatIdentityEntity> {
    return this.repo.save(this.repo.create(identity));
  }
}
