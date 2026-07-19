import {
  BOOSTER_SERVICE_REGIONS,
  WalletStatus,
  type BoosterPublicView,
  type BoosterServiceRegion,
  type WalletView,
} from '@app/contracts';

type BoosterRegionSource = Pick<BoosterPublicView, 'serviceRegions'>;
type WalletBalanceSource = Pick<WalletView, 'balanceFen' | 'status'>;

/** 重新挑人返回结算页时，优先保留仍被新打手支持的原区服。 */
export function resolveCheckoutServiceRegion(
  selectedBooster: BoosterRegionSource | null,
  savedRegion?: BoosterServiceRegion,
): BoosterServiceRegion {
  if (
    savedRegion &&
    (!selectedBooster || selectedBooster.serviceRegions.includes(savedRegion))
  ) {
    return savedRegion;
  }
  return (
    selectedBooster?.serviceRegions[0] ??
    savedRegion ??
    BOOSTER_SERVICE_REGIONS[0].value
  );
}

/** 区服切换只允许保留当前值或单向回退，空区服时不产生写回值。 */
export function resolveCompatibleServiceRegion(
  selectedBooster: BoosterRegionSource,
  requestedRegion: BoosterServiceRegion,
): BoosterServiceRegion | null {
  if (selectedBooster.serviceRegions.includes(requestedRegion)) {
    return requestedRegion;
  }
  return selectedBooster.serviceRegions[0] ?? null;
}

/** 钱包数据加载完成后，统一判断余额支付是否可用。 */
export function isWalletBalanceUnavailable(
  wallet: WalletBalanceSource | null,
  walletError: boolean,
  amountFen: number,
): boolean {
  return (
    walletError ||
    !wallet ||
    wallet.status === WalletStatus.Frozen ||
    wallet.balanceFen < amountFen
  );
}
