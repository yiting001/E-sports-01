import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, beforeEach, test } from 'node:test';
import { BoosterStatus, PenaltySource, WalletStatus } from '@app/contracts';
import { DataSource, type EntityManager } from 'typeorm';
import { loadEnvConfig } from '../src/bootstrap/env.config';
import { BoosterApplicationEntity } from '../src/modules/booster/domain/booster-application.entity';
import { BoosterPenaltyEntity } from '../src/modules/booster/domain/booster-penalty.entity';
import { TypeormBoosterFinanceSettlement } from '../src/modules/booster/infrastructure/booster-finance.settlement';
import { WalletEntity } from '../src/modules/wallet/domain/wallet.entity';
import { WalletTransactionEntity } from '../src/modules/wallet/domain/wallet-transaction.entity';
import {
  TypeormWalletTransactionParticipant,
  type AdjustWalletTransactionInput,
  type AdjustWalletTransactionResult,
  type WalletTransactionParticipant,
} from '../src/modules/wallet/infrastructure/wallet-transaction.participant';
import { TenantContextService } from '../src/shared/tenant/tenant-context.service';

const TENANT_ID = 'tenant-finance-e2e';
const BOOSTER_USER_ID = 'booster-finance-e2e';
const schema = `booster_finance_e2e_${randomUUID().replaceAll('-', '').slice(0, 16)}`;

let adminDataSource: DataSource;
let dataSource: DataSource;
let tenant: TenantContextService;
let walletTransaction: TypeormWalletTransactionParticipant;

before(async () => {
  const env = loadEnvConfig();
  const connection = {
    type: 'postgres' as const,
    host: env.database.host,
    port: env.database.port,
    username: env.database.user,
    password: env.database.password,
    database: env.database.name,
  };
  adminDataSource = await new DataSource(connection).initialize();
  await adminDataSource.query(`CREATE SCHEMA "${schema}"`);
  dataSource = await new DataSource({
    ...connection,
    schema,
    entities: [
      BoosterApplicationEntity,
      BoosterPenaltyEntity,
      WalletEntity,
      WalletTransactionEntity,
    ],
    synchronize: true,
    uuidExtension: 'pgcrypto',
    installExtensions: false,
  }).initialize();
  tenant = new TenantContextService();
  walletTransaction = new TypeormWalletTransactionParticipant();
});

beforeEach(async () => {
  await dataSource.query(
    `TRUNCATE TABLE
      "${schema}"."booster_penalty",
      "${schema}"."wallet_transaction",
      "${schema}"."wallet",
      "${schema}"."booster_application"
    CASCADE`,
  );
});

after(async () => {
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
  }
  if (adminDataSource?.isInitialized) {
    await adminDataSource.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await adminDataSource.destroy();
  }
});

test('通用余额罚款在同一事务扣余额、写流水并保存罚款', async () => {
  await seedBooster();
  const wallet = await seedWallet();
  const settlement = new TypeormBoosterFinanceSettlement(dataSource, tenant, walletTransaction);

  const result = await inTenant(() =>
    settlement.createPenalty({
      operatorId: 'operator-finance-e2e',
      boosterUserId: BOOSTER_USER_ID,
      orderNo: 'ORDER-FINANCE-E2E',
      amountFen: 300,
      source: PenaltySource.Balance,
      reason: '通用罚款事务验证',
    }),
  );

  assert.equal(result.outcome, 'created');
  const savedWallet = await dataSource.getRepository(WalletEntity).findOneByOrFail({
    id: wallet.id,
  });
  assert.equal(savedWallet.balanceFen, 700);
  assert.equal(await dataSource.getRepository(WalletTransactionEntity).count(), 1);
  assert.equal(await dataSource.getRepository(BoosterPenaltyEntity).count(), 1);
});

test('钱包调整后发生故障会回滚余额、流水和罚款', async () => {
  await seedBooster();
  const wallet = await seedWallet();
  const settlement = new TypeormBoosterFinanceSettlement(
    dataSource,
    tenant,
    new FailingWalletParticipant(walletTransaction),
  );

  await assert.rejects(
    inTenant(() =>
      settlement.createPenalty({
        operatorId: 'operator-finance-e2e',
        boosterUserId: BOOSTER_USER_ID,
        orderNo: 'ORDER-ROLLBACK-E2E',
        amountFen: 300,
        source: PenaltySource.Balance,
        reason: '验证事务回滚',
      }),
    ),
    /模拟钱包调整后故障/,
  );

  const savedWallet = await dataSource.getRepository(WalletEntity).findOneByOrFail({
    id: wallet.id,
  });
  assert.equal(savedWallet.balanceFen, 1_000);
  assert.equal(await dataSource.getRepository(WalletTransactionEntity).count(), 0);
  assert.equal(await dataSource.getRepository(BoosterPenaltyEntity).count(), 0);
});

class FailingWalletParticipant implements WalletTransactionParticipant {
  constructor(private readonly delegate: WalletTransactionParticipant) {}

  async adjust(
    manager: EntityManager,
    input: AdjustWalletTransactionInput,
  ): Promise<AdjustWalletTransactionResult> {
    const result = await this.delegate.adjust(manager, input);
    if (result.outcome === 'adjusted') {
      throw new Error('模拟钱包调整后故障');
    }
    return result;
  }
}

function inTenant<T>(work: () => Promise<T>): Promise<T> {
  return tenant.run({ tenantId: TENANT_ID, isSuper: false }, work);
}

function seedBooster(): Promise<BoosterApplicationEntity> {
  const repository = dataSource.getRepository(BoosterApplicationEntity);
  return repository.save(
    repository.create({
      tenantId: TENANT_ID,
      userId: BOOSTER_USER_ID,
      applicantName: '财务事务测试打手',
      intro: 'PostgreSQL finance transaction e2e',
      status: BoosterStatus.Approved,
      depositFen: 1_000,
    }),
  );
}

function seedWallet(): Promise<WalletEntity> {
  const repository = dataSource.getRepository(WalletEntity);
  return repository.save(
    repository.create({
      tenantId: TENANT_ID,
      userId: BOOSTER_USER_ID,
      balanceFen: 1_000,
      totalRechargeFen: 0,
      totalWithdrawFen: 0,
      status: WalletStatus.Active,
    }),
  );
}
