import { readonly, ref } from 'vue';
import { walletApi } from '@/api/wallet.api';
import type { WalletView } from '@/types/wallet';

/**
 * 当前登录用户的钱包余额（个人页余额卡）。
 * 与会员概览同构：请求 silent、修订号防过期响应，登出时复位。
 */

const mineRef = ref<WalletView | null>(null);
const loadingRef = ref(false);
let revision = 0;

async function refresh(): Promise<void> {
  const requestRevision = ++revision;
  loadingRef.value = true;
  try {
    const result = await walletApi.mine();
    if (requestRevision === revision) {
      mineRef.value = result;
    }
  } catch {
    if (requestRevision === revision) {
      mineRef.value = null;
    }
  } finally {
    if (requestRevision === revision) {
      loadingRef.value = false;
    }
  }
}

/** 登出或换号时废弃在途响应 */
function reset(): void {
  revision += 1;
  mineRef.value = null;
  loadingRef.value = false;
}

export const wallet = {
  mine: readonly(mineRef),
  loading: readonly(loadingRef),
  refresh,
  reset,
};
