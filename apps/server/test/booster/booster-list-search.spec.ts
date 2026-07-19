import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BOOSTER_LEVEL_DEFAULTS,
  BOOSTER_LIMITS,
  BoosterContactType,
  BoosterGender,
  BoosterStatus,
} from '@app/contracts';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BoosterPolicyService } from '../../src/modules/booster/application/booster-policy.service';
import { ListBoosterUseCase } from '../../src/modules/booster/application/use-cases/list-booster.usecase';
import { BoosterApplicationEntity } from '../../src/modules/booster/domain/booster-application.entity';
import type { BoosterRepository } from '../../src/modules/booster/domain/booster-repository.interface';
import { TypeormBoosterRepository } from '../../src/modules/booster/infrastructure/booster.repository';
import { BoosterListQueryDto } from '../../src/modules/booster/interfaces/dto/booster-list-query.dto';
import { UserDirectory } from '../../src/modules/rbac/application/user-directory.service';
import { TenantContextService } from '../../src/shared/tenant/tenant-context.service';
import type { Repository } from 'typeorm';

function createApplication(): BoosterApplicationEntity {
  const entity = new BoosterApplicationEntity();
  entity.id = 'application-id';
  entity.tenantId = 'tenant-id';
  entity.userId = 'user-id';
  entity.applicantName = '张三';
  entity.gender = BoosterGender.Male;
  entity.serviceRegions = ['delta-mobile'];
  entity.intro = '熟悉移动端接单流程';
  entity.contactType = BoosterContactType.Phone;
  entity.contactValue = 'wechat-contact';
  entity.materialImage = '';
  entity.voiceUrl = '';
  entity.invitationCode = '';
  entity.legacyGameNickname = '';
  entity.legacyGameName = '';
  entity.legacyRank = '';
  entity.status = BoosterStatus.Approved;
  entity.rejectReason = '';
  entity.reviewedBy = '';
  entity.reviewedAt = null;
  entity.completedOrders = 0;
  entity.depositFen = 0;
  entity.createdAt = new Date('2026-07-19T00:00:00.000Z');
  entity.updatedAt = new Date('2026-07-19T00:00:00.000Z');
  return entity;
}

test('管理端打手搜索关键词在校验前去除首尾空白并限制长度', async () => {
  const dto = plainToInstance(BoosterListQueryDto, {
    page: 1,
    pageSize: 20,
    keyword: '  张三  ',
  });
  assert.equal(dto.keyword, '张三');
  assert.equal((await validate(dto)).length, 0);

  const tooLong = plainToInstance(BoosterListQueryDto, {
    page: 1,
    pageSize: 20,
    keyword: 'a'.repeat(BOOSTER_LIMITS.directoryKeywordMax + 1),
  });
  assert.ok((await validate(tooLong)).some((error) => error.property === 'keyword'));
});

test('管理列表向仓储传递规范化关键词并保留服务端分页总数', async () => {
  const calls: Array<{
    skip: number;
    take: number;
    status: BoosterStatus | undefined;
    keyword: string | undefined;
  }> = [];
  const application = createApplication();
  const repository = {
    paginate: async (
      skip: number,
      take: number,
      status?: BoosterStatus,
      keyword?: string,
    ): Promise<[BoosterApplicationEntity[], number]> => {
      calls.push({ skip, take, status, keyword });
      return [[application], 37];
    },
  } as unknown as BoosterRepository;
  const users = {
    resolveProfiles: async () =>
      new Map([['user-id', { username: 'booster-user', nickname: '小张' }]]),
  } as unknown as UserDirectory;
  const policy = {
    getLevelTiers: async () => BOOSTER_LEVEL_DEFAULTS,
  } as unknown as BoosterPolicyService;
  const useCase = new ListBoosterUseCase(repository, users, policy);

  const result = await useCase.execute(2, 20, 20, BoosterStatus.Approved, '  13800138000  ');

  assert.deepEqual(calls, [
    {
      skip: 20,
      take: 20,
      status: BoosterStatus.Approved,
      keyword: '13800138000',
    },
  ]);
  assert.equal(result.total, 37);
  assert.equal(result.page, 2);
  assert.equal(result.pageSize, 20);
  assert.equal(result.list[0]?.nickname, '小张');
});

test('管理列表仓储在同租户注册用户中匹配名称和手机号并使用数据库总数', async () => {
  const application = createApplication();
  const joins: Array<{ table: string; alias: string; condition: string }> = [];
  const conditions: Array<{ sql: string; parameters?: Record<string, unknown> }> = [];
  let countQueryCalled = false;
  const query = {
    orderBy: () => query,
    skip: () => query,
    take: () => query,
    leftJoin: (table: string, alias: string, condition: string) => {
      joins.push({ table, alias, condition });
      return query;
    },
    andWhere: (sql: string, parameters?: Record<string, unknown>) => {
      conditions.push({ sql, parameters });
      return query;
    },
    getManyAndCount: async (): Promise<[BoosterApplicationEntity[], number]> => {
      countQueryCalled = true;
      return [[application], 12];
    },
  };
  const typeormRepository = {
    createQueryBuilder: () => query,
  } as unknown as Repository<BoosterApplicationEntity>;
  const tenant = {
    scopeId: () => 'tenant-id',
  } as unknown as TenantContextService;
  const repository = new TypeormBoosterRepository(typeormRepository, tenant);

  const result = await repository.paginate(0, 20, BoosterStatus.Approved, ' 张%三_ ');

  assert.equal(countQueryCalled, true);
  assert.equal(result[1], 12);
  assert.equal(joins[0]?.table, 'rbac_user');
  assert.match(joins[0]?.condition ?? '', /registered_user.*tenant_id.*booster.*tenant_id/);
  assert.ok(
    conditions.some(
      ({ sql, parameters }) =>
        sql.includes('"booster"."tenant_id" = :tenantId') && parameters?.tenantId === 'tenant-id',
    ),
  );
  const keywordCondition = conditions.find(({ sql }) => sql.includes('registered_user"."phone'));
  assert.match(keywordCondition?.sql ?? '', /applicant_name/);
  assert.match(keywordCondition?.sql ?? '', /nickname/);
  assert.equal(keywordCondition?.parameters?.keyword, '%张\\%三\\_%');
});
