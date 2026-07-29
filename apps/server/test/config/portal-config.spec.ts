import assert from 'node:assert/strict';
import test from 'node:test';
import { CONFIG_KEYS } from '@app/contracts';
import { ConfigService } from '../../src/modules/config/application/config.service';
import { GetPortalConfigUseCase } from '../../src/modules/config/application/use-cases/get-portal-config.usecase';

function createUseCase(values: Record<string, boolean>): GetPortalConfigUseCase {
  const config = {
    getBoolean: async (key: string, fallback: boolean) => values[key] ?? fallback,
  } as unknown as ConfigService;
  return new GetPortalConfigUseCase(config);
}

test('门户配置缺失时默认展示排行榜并关闭 vConsole', async () => {
  assert.deepEqual(await createUseCase({}).execute(), {
    showRank: true,
    vConsoleEnabled: false,
  });
});

test('门户配置按后台布尔值下发 vConsole 开关', async () => {
  assert.deepEqual(
    await createUseCase({
      [CONFIG_KEYS.portal.showRank]: false,
      [CONFIG_KEYS.portal.vConsoleEnabled]: true,
    }).execute(),
    { showRank: false, vConsoleEnabled: true },
  );
});
