<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import {
  FundDirection,
  PaymentProvider,
  PayoutProvider,
  WalletStatus,
  WalletTxnType,
  WithdrawalStatus,
} from '@app/contracts';
import { ElMessage } from 'element-plus';
import QRCode from 'qrcode';
import { storeToRefs } from 'pinia';
import WalletActions from '@/components/wallet/WalletActions.vue';
import WalletDirectory from '@/components/wallet/WalletDirectory.vue';
import WalletHero from '@/components/wallet/WalletHero.vue';
import WalletRechargeDialog, {
  type WalletRechargeForm,
} from '@/components/wallet/WalletRechargeDialog.vue';
import WalletStats from '@/components/wallet/WalletStats.vue';
import WalletWithdrawDialog, {
  type WalletWithdrawForm,
} from '@/components/wallet/WalletWithdrawDialog.vue';
import { useWalletStore } from '@/stores/wallet.store';
import { walletApi } from '@/api/wallet.api';
import './WalletView.css';
import './WalletView.responsive.css';

const store = useWalletStore();
const { wallet, stats, transactions, total, page, pageSize, loading } =
  storeToRefs(store);

/** 充值弹窗状态 */
const rechargeVisible = ref(false);
const rechargeSubmitting = ref(false);
const rechargeQr = ref('');
const rechargeForm = reactive<WalletRechargeForm>({
  amountYuan: 1,
  provider: PaymentProvider.Alipay,
});

/** 提现弹窗状态 */
const withdrawVisible = ref(false);
const withdrawSubmitting = ref(false);
const withdrawForm = reactive<WalletWithdrawForm>({
  amountYuan: 1,
  provider: PayoutProvider.Alipay,
  account: '',
  accountName: '',
});

const txnTypeText: Record<WalletTxnType, string> = {
  [WalletTxnType.Recharge]: '充值',
  [WalletTxnType.Withdraw]: '提现',
  [WalletTxnType.Adjust]: '调整',
};

const walletStatusLabel = computed(() =>
  wallet.value?.status === WalletStatus.Frozen ? '冻结' : '正常',
);
const walletStatusClass = computed(() =>
  wallet.value?.status === WalletStatus.Frozen ? 'is-frozen' : 'is-active',
);
const latestTransactionText = computed(() => {
  const first = transactions.value[0];
  if (!first) {
    return '暂无流水';
  }
  return `${txnTypeText[first.type]} ${first.direction === FundDirection.In ? '+' : '-'}${first.amountYuan} 元`;
});
const balanceYuan = computed(() => wallet.value?.balanceYuan ?? '0.00');
const totalRechargeYuan = computed(() => stats.value?.totalRechargeYuan ?? '0.00');
const totalWithdrawYuan = computed(() => stats.value?.totalWithdrawYuan ?? '0.00');
const rechargeCount = computed(() => stats.value?.rechargeCount ?? 0);
const withdrawCount = computed(() => stats.value?.withdrawCount ?? 0);

function yuanToFen(yuan: number): number {
  return Math.round(yuan * 100);
}

function openRecharge(): void {
  rechargeQr.value = '';
  rechargeForm.amountYuan = 1;
  rechargeForm.provider = PaymentProvider.Alipay;
  rechargeVisible.value = true;
}

function updateRechargeForm(value: WalletRechargeForm): void {
  Object.assign(rechargeForm, value);
}

async function submitRecharge(): Promise<void> {
  rechargeSubmitting.value = true;
  try {
    const result = await walletApi.recharge({
      amountFen: yuanToFen(rechargeForm.amountYuan),
      provider: rechargeForm.provider,
    });
    rechargeQr.value = await QRCode.toDataURL(result.qrCode);
    ElMessage.success('下单成功，请扫码支付，支付完成后点击「我已支付」刷新');
  } finally {
    rechargeSubmitting.value = false;
  }
}

async function confirmPaid(): Promise<void> {
  await store.refresh();
  rechargeVisible.value = false;
  ElMessage.success('已刷新钱包余额');
}

function openWithdraw(): void {
  withdrawForm.amountYuan = 1;
  withdrawForm.provider = PayoutProvider.Alipay;
  withdrawForm.account = '';
  withdrawForm.accountName = '';
  withdrawVisible.value = true;
}

function updateWithdrawForm(value: WalletWithdrawForm): void {
  Object.assign(withdrawForm, value);
}

async function submitWithdraw(): Promise<void> {
  if (!withdrawForm.account || !withdrawForm.accountName) {
    ElMessage.warning('请填写收款支付宝账号与真实姓名');
    return;
  }
  withdrawSubmitting.value = true;
  try {
    const result = await walletApi.withdraw({
      amountFen: yuanToFen(withdrawForm.amountYuan),
      provider: withdrawForm.provider,
      account: withdrawForm.account,
      accountName: withdrawForm.accountName,
    });
    if (result.status === WithdrawalStatus.Success) {
      ElMessage.success('提现成功');
    } else {
      ElMessage.error(`提现失败：${result.failReason ?? '请稍后重试'}`);
    }
    withdrawVisible.value = false;
    await store.refresh();
  } finally {
    withdrawSubmitting.value = false;
  }
}

onMounted(() => {
  void store.init();
});
</script>

<template>
  <section
    v-loading="loading"
    class="wallet-page"
  >
    <wallet-hero
      :balance-yuan="balanceYuan"
      :status-label="walletStatusLabel"
      :status-class="walletStatusClass"
      @recharge="openRecharge"
      @withdraw="openWithdraw"
      @refresh="store.refresh"
    />
    <wallet-stats
      :balance-yuan="balanceYuan"
      :status-label="walletStatusLabel"
      :total-recharge-yuan="totalRechargeYuan"
      :recharge-count="rechargeCount"
      :total-withdraw-yuan="totalWithdrawYuan"
      :withdraw-count="withdrawCount"
      :total="total"
      :latest-transaction-text="latestTransactionText"
    />
    <wallet-directory
      :transactions="transactions"
      :total="total"
      :page="page"
      :page-size="pageSize"
      :loading="loading"
      @refresh="store.refresh"
      @recharge="openRecharge"
      @update:page="store.changePage"
    />
    <wallet-actions
      @recharge="openRecharge"
      @withdraw="openWithdraw"
      @refresh="store.refresh"
    />
    <wallet-recharge-dialog
      v-model="rechargeVisible"
      :form="rechargeForm"
      :submitting="rechargeSubmitting"
      :qr-code="rechargeQr"
      @update:form="updateRechargeForm"
      @submit="submitRecharge"
      @paid="confirmPaid"
    />
    <wallet-withdraw-dialog
      v-model="withdrawVisible"
      :form="withdrawForm"
      :submitting="withdrawSubmitting"
      @update:form="updateWithdrawForm"
      @submit="submitWithdraw"
    />
  </section>
</template>
