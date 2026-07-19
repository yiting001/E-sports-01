import { WalletStatus } from '@app/contracts';
import { describe, expect, it } from 'vitest';
import {
  isWalletBalanceUnavailable,
  resolveCompatibleServiceRegion,
  resolveCheckoutServiceRegion,
} from './checkout-state';

describe('resolveCheckoutServiceRegion', () => {
  it('保留新打手仍支持的原区服', () => {
    expect(
      resolveCheckoutServiceRegion(
        { serviceRegions: ['delta-mobile', 'delta-pc'] },
        'delta-pc',
      ),
    ).toBe('delta-pc');
  });

  it('原区服不兼容时回退到打手首个区服', () => {
    expect(
      resolveCheckoutServiceRegion(
        { serviceRegions: ['delta-mobile'] },
        'delta-pc',
      ),
    ).toBe('delta-mobile');
  });
});

describe('resolveCompatibleServiceRegion', () => {
  it('只回退一次且不会在空区服打手上来回切换', () => {
    expect(
      resolveCompatibleServiceRegion({ serviceRegions: ['delta-mobile'] }, 'delta-pc'),
    ).toBe('delta-mobile');
    expect(
      resolveCompatibleServiceRegion({ serviceRegions: [] }, 'delta-pc'),
    ).toBeNull();
  });
});

describe('isWalletBalanceUnavailable', () => {
  it('仅在钱包正常且余额充足时允许余额支付', () => {
    expect(
      isWalletBalanceUnavailable(
        { status: WalletStatus.Active, balanceFen: 100 },
        false,
        100,
      ),
    ).toBe(false);
    expect(
      isWalletBalanceUnavailable(
        { status: WalletStatus.Active, balanceFen: 99 },
        false,
        100,
      ),
    ).toBe(true);
    expect(
      isWalletBalanceUnavailable(
        { status: WalletStatus.Frozen, balanceFen: 100 },
        false,
        100,
      ),
    ).toBe(true);
    expect(isWalletBalanceUnavailable(null, true, 100)).toBe(true);
  });
});
