import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { CONFIG_KEYS } from '@app/contracts';
import type { ConfigService } from '../../src/modules/config/application/config.service';
import { GetWithdrawTaxConfigUseCase } from '../../src/modules/wallet/application/use-cases/get-withdraw-tax-config.usecase';
import { SaveWithdrawTaxConfigUseCase } from '../../src/modules/wallet/application/use-cases/save-withdraw-tax-config.usecase';

function createConfigStub(initialTiers: unknown, fallbackRateBp: number) {
  const written: Array<{ key: string; value: unknown }> = [];
  let tiers = initialTiers;
  const config = {
    getJson: async <T>(_key: string, _fallback: T): Promise<T> => tiers as T,
    getNumber: async (): Promise<number> => fallbackRateBp,
    setJson: async <T>(key: string, value: T): Promise<void> => {
      written.push({ key, value });
      tiers = value;
    },
  } as unknown as ConfigService;
  return { config, written };
}

test('GetWithdrawTaxConfigUseCase 返回规整后的档位与回退费率', async () => {
  const { config } = createConfigStub(
    [
      { minFen: 100000, rateBp: 300 },
      { minFen: 0, rateBp: 100 },
      { minFen: -5, rateBp: 100 },
    ],
    50,
  );
  const useCase = new GetWithdrawTaxConfigUseCase(config);

  const result = await useCase.execute();

  assert.deepEqual(result, {
    tiers: [
      { minFen: 0, rateBp: 100 },
      { minFen: 100000, rateBp: 300 },
    ],
    fallbackRateBp: 50,
  });
});

test('SaveWithdrawTaxConfigUseCase 规整升序后写入配置中心并返回最新配置', async () => {
  const { config, written } = createConfigStub([], 50);
  const useCase = new SaveWithdrawTaxConfigUseCase(
    config,
    new GetWithdrawTaxConfigUseCase(config),
  );

  const result = await useCase.execute([
    { minFen: 100000, rateBp: 300 },
    { minFen: 0, rateBp: 100 },
  ]);

  assert.equal(written.length, 1);
  assert.equal(written[0].key, CONFIG_KEYS.wallet.withdrawTaxTiers);
  assert.deepEqual(written[0].value, [
    { minFen: 0, rateBp: 100 },
    { minFen: 100000, rateBp: 300 },
  ]);
  assert.deepEqual(result.tiers, [
    { minFen: 0, rateBp: 100 },
    { minFen: 100000, rateBp: 300 },
  ]);
});

test('SaveWithdrawTaxConfigUseCase 起始金额重复时拒绝保存', async () => {
  const { config, written } = createConfigStub([], 50);
  const useCase = new SaveWithdrawTaxConfigUseCase(
    config,
    new GetWithdrawTaxConfigUseCase(config),
  );

  await assert.rejects(
    useCase.execute([
      { minFen: 0, rateBp: 100 },
      { minFen: 0, rateBp: 200 },
    ]),
    BadRequestException,
  );
  assert.equal(written.length, 0);
});

test('SaveWithdrawTaxConfigUseCase 空数组清空阶梯（回退单一费率）', async () => {
  const { config, written } = createConfigStub([{ minFen: 0, rateBp: 100 }], 50);
  const useCase = new SaveWithdrawTaxConfigUseCase(
    config,
    new GetWithdrawTaxConfigUseCase(config),
  );

  const result = await useCase.execute([]);

  assert.deepEqual(written[0].value, []);
  assert.deepEqual(result, { tiers: [], fallbackRateBp: 50 });
});
