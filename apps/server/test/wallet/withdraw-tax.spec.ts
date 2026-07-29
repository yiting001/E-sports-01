import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PayoutProvider,
  WithdrawalStatus,
  pickWithdrawFeeRateBp,
  sanitizeWithdrawTaxTiers,
} from '@app/contracts';
import { ExportWithdrawalTaxUseCase } from '../../src/modules/wallet/application/use-cases/export-withdrawal-tax.usecase';
import { WithdrawalOrderEntity } from '../../src/modules/wallet/domain/withdrawal-order.entity';
import type { WithdrawalOrderRepository } from '../../src/modules/wallet/domain/withdrawal-repository.interface';

test('sanitizeWithdrawTaxTiers 过滤非法档位并按金额升序去重', () => {
  assert.deepEqual(sanitizeWithdrawTaxTiers(null), []);
  assert.deepEqual(sanitizeWithdrawTaxTiers('not-array'), []);
  assert.deepEqual(
    sanitizeWithdrawTaxTiers([
      { minFen: 100000, rateBp: 300 },
      { minFen: 0, rateBp: 100 },
      { minFen: -1, rateBp: 100 },
      { minFen: 0, rateBp: 200 },
      { minFen: 500, rateBp: 10001 },
      { minFen: 1.5, rateBp: 100 },
    ]),
    [
      { minFen: 0, rateBp: 200 },
      { minFen: 100000, rateBp: 300 },
    ],
  );
});

test('pickWithdrawFeeRateBp 按金额取最高命中档，无档位回退单一费率', () => {
  const tiers = [
    { minFen: 0, rateBp: 100 },
    { minFen: 100000, rateBp: 300 },
    { minFen: 500000, rateBp: 600 },
  ];
  assert.equal(pickWithdrawFeeRateBp(50000, tiers, 50), 100);
  assert.equal(pickWithdrawFeeRateBp(100000, tiers, 50), 300);
  assert.equal(pickWithdrawFeeRateBp(999999, tiers, 50), 600);
  assert.equal(pickWithdrawFeeRateBp(50000, [], 50), 50);
  assert.equal(
    pickWithdrawFeeRateBp(100, [{ minFen: 1000, rateBp: 100 }], 50),
    50,
  );
});

function createSuccessOrder(
  overrides: Partial<WithdrawalOrderEntity>,
): WithdrawalOrderEntity {
  return Object.assign(new WithdrawalOrderEntity(), {
    id: 'order-id',
    walletId: 'wallet-id',
    outBizNo: 'W123',
    amountFen: 100000,
    feeFen: 3000,
    provider: PayoutProvider.Alipay,
    status: WithdrawalStatus.Success,
    account: 'user@example.com',
    accountName: '张三',
    idCardNo: '11010119900101003X',
    providerOrderId: 'ali-1',
    failReason: null,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    ...overrides,
  });
}

test('ExportWithdrawalTaxUseCase 导出已到账提现单为报税 CSV', async () => {
  const queried: WithdrawalStatus[] = [];
  const repo = {
    listByStatus: async (status: WithdrawalStatus) => {
      queried.push(status);
      return [
        createSuccessOrder({}),
        createSuccessOrder({
          id: 'order-2',
          outBizNo: 'W124',
          accountName: '李,四',
          idCardNo: null,
        }),
      ];
    },
  } as unknown as WithdrawalOrderRepository;
  const useCase = new ExportWithdrawalTaxUseCase(repo);

  const result = await useCase.execute();

  assert.deepEqual(queried, [WithdrawalStatus.Success]);
  assert.equal(result.count, 2);
  assert.match(result.filename, /^提现报税表单-\d{4}-\d{2}-\d{2}\.csv$/);
  const lines = result.csv.split('\n');
  assert.equal(lines.length, 3);
  assert.ok(lines[0].startsWith('序号,姓名,身份证号'));
  assert.equal(
    lines[1],
    '1,张三,11010119900101003X,user@example.com,1000.00,30.00,970.00,W123,ali-1,2026-07-01T00:00:00.000Z',
  );
  assert.ok(lines[2].includes('"李,四"'));
  assert.ok(lines[2].includes(',,user@example.com'));
});
