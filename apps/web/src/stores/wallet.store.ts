import type {
  PaginationQuery,
  WalletStatsView,
  WalletTransactionView,
  WalletView,
} from '@app/contracts';
import { PAGINATION_DEFAULTS } from '@app/contracts';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { walletApi } from '@/api/wallet.api';

/**
 * 钱包状态。
 * 打开页面即拉取钱包（后端无则自动初始化）、统计与首页流水；
 * 充值/提现成功后调用 refresh 同步余额与明细。仅做状态编排，业务校验在后端。
 */
export const useWalletStore = defineStore('wallet', () => {
  const wallet = ref<WalletView | null>(null);
  const stats = ref<WalletStatsView | null>(null);
  const transactions = ref<WalletTransactionView[]>([]);
  const total = ref(0);
  const page = ref<number>(PAGINATION_DEFAULTS.page);
  const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
  const loading = ref(false);

  async function loadTransactions(): Promise<void> {
    const query: PaginationQuery = { page: page.value, pageSize: pageSize.value };
    const data = await walletApi.transactions(query);
    transactions.value = data.list;
    total.value = data.total;
  }

  /** 初始化：并发拉取钱包、统计与首页流水 */
  async function init(): Promise<void> {
    loading.value = true;
    try {
      const [walletView, statsView] = await Promise.all([
        walletApi.mine(),
        walletApi.stats(),
        loadTransactions(),
      ]);
      wallet.value = walletView;
      stats.value = statsView;
    } finally {
      loading.value = false;
    }
  }

  /** 刷新余额、统计与当前页流水（收支成功后调用） */
  async function refresh(): Promise<void> {
    const [walletView, statsView] = await Promise.all([
      walletApi.mine(),
      walletApi.stats(),
      loadTransactions(),
    ]);
    wallet.value = walletView;
    stats.value = statsView;
  }

  /** 切换流水分页页码并重新拉取 */
  async function changePage(next: number): Promise<void> {
    page.value = next;
    await loadTransactions();
  }

  /** 切换流水每页条数并回到第一页 */
  async function changePageSize(next: number): Promise<void> {
    pageSize.value = next;
    page.value = PAGINATION_DEFAULTS.page;
    await loadTransactions();
  }

  return {
    wallet,
    stats,
    transactions,
    total,
    page,
    pageSize,
    loading,
    init,
    refresh,
    changePage,
    changePageSize,
  };
});
