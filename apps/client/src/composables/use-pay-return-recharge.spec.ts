import { describe, expect, it } from 'vitest';
import { RechargeStatus } from '@app/contracts';
import { confirmRechargeReturn } from './use-pay-return-recharge';

function ports(status: RechargeStatus) {
  const calls: string[] = [];
  return {
    calls,
    rechargeStatus: async (outTradeNo: string) => {
      calls.push(outTradeNo);
      return { status };
    },
  };
}

describe('confirmRechargeReturn', () => {
  it('以服务端查单结果为准：已入账 → paid', async () => {
    const p = ports(RechargeStatus.Paid);
    await expect(confirmRechargeReturn('R1', p)).resolves.toBe('paid');
    expect(p.calls).toEqual(['R1']);
  });

  it('待支付 → pending，已关闭 → closed', async () => {
    await expect(confirmRechargeReturn('R1', ports(RechargeStatus.Pending))).resolves.toBe(
      'pending',
    );
    await expect(confirmRechargeReturn('R1', ports(RechargeStatus.Closed))).resolves.toBe(
      'closed',
    );
  });

  it('查单请求失败 → error，不抛出', async () => {
    await expect(
      confirmRechargeReturn('R1', {
        rechargeStatus: () => Promise.reject(new Error('network')),
      }),
    ).resolves.toBe('error');
  });
});
