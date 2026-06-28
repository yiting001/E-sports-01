<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import {
  FundDirection,
  PaymentProvider,
  PayoutProvider,
  PERMS,
  WalletStatus,
  WalletTxnType,
  WithdrawalStatus,
} from '@app/contracts';
import { ElMessage } from 'element-plus';
import {
  CircleCheck,
  CreditCard,
  Download,
  Money,
  Refresh,
  Tickets,
  TrendCharts,
  Upload,
  Wallet,
} from '@element-plus/icons-vue';
import QRCode from 'qrcode';
import { storeToRefs } from 'pinia';
import AppDataTable from '@/components/common/AppDataTable.vue';
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
const rechargeForm = reactive({
  amountYuan: 1,
  provider: PaymentProvider.Alipay,
});

/** 提现弹窗状态 */
const withdrawVisible = ref(false);
const withdrawSubmitting = ref(false);
const withdrawForm = reactive({
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

function yuanToFen(yuan: number): number {
  return Math.round(yuan * 100);
}

function openRecharge(): void {
  rechargeQr.value = '';
  rechargeForm.amountYuan = 1;
  rechargeForm.provider = PaymentProvider.Alipay;
  rechargeVisible.value = true;
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
    <header class="wallet-hero">
      <div class="wallet-hero__content">
        <span class="wallet-eyebrow">Wallet Center</span>
        <h1>资金钱包</h1>
        <p>统一管理当前账号的钱包余额、充值提现和收支流水，交易能力接入权限控制与配置中心。</p>
        <div class="wallet-hero__actions">
          <el-button
            v-permission="PERMS.wallet.recharge"
            type="primary"
            :icon="Upload"
            @click="openRecharge"
          >
            充值
          </el-button>
          <el-button
            v-permission="PERMS.wallet.withdraw"
            :icon="Download"
            @click="openWithdraw"
          >
            提现
          </el-button>
          <el-button
            :icon="Refresh"
            @click="store.refresh"
          >
            刷新
          </el-button>
        </div>
      </div>
      <div class="wallet-hero__visual">
        <div class="wallet-balance-card">
          <span class="wallet-balance-card__label">
            <el-icon><Wallet /></el-icon>
            可用余额
          </span>
          <strong>{{ wallet?.balanceYuan ?? '0.00' }}</strong>
          <small>人民币 / 元</small>
          <span
            class="wallet-status-pill"
            :class="walletStatusClass"
          >
            {{ walletStatusLabel }}
          </span>
        </div>
        <div class="wallet-flow">
          <span class="wallet-flow__line flow-line-a" />
          <span class="wallet-flow__line flow-line-b" />
          <span class="wallet-flow__line flow-line-c" />
          <span class="wallet-core">
            <el-icon><Money /></el-icon>
          </span>
          <span class="wallet-node wallet-node-a">
            <el-icon><Upload /></el-icon>
          </span>
          <span class="wallet-node wallet-node-b">
            <el-icon><Download /></el-icon>
          </span>
          <span class="wallet-node wallet-node-c">
            <el-icon><Tickets /></el-icon>
          </span>
        </div>
      </div>
    </header>

    <section class="wallet-stats">
      <article class="wallet-stat">
        <span>账户余额（元）</span>
        <strong>{{ wallet?.balanceYuan ?? '0.00' }}</strong>
        <small>{{ walletStatusLabel }}状态</small>
      </article>
      <article class="wallet-stat">
        <span>累计充值（元）</span>
        <strong>{{ stats?.totalRechargeYuan ?? '0.00' }}</strong>
        <small>{{ stats?.rechargeCount ?? 0 }} 笔</small>
      </article>
      <article class="wallet-stat">
        <span>累计提现（元）</span>
        <strong>{{ stats?.totalWithdrawYuan ?? '0.00' }}</strong>
        <small>{{ stats?.withdrawCount ?? 0 }} 笔</small>
      </article>
      <article class="wallet-stat">
        <span>最近流水</span>
        <strong>{{ total }}</strong>
        <small>{{ latestTransactionText }}</small>
      </article>
    </section>

    <section class="wallet-panel">
      <div class="wallet-panel__head">
        <div>
          <p>Transaction Ledger</p>
          <h2>
            收支明细
          </h2>
        </div>
        <div class="wallet-panel__actions">
          <el-button
            :icon="Refresh"
            @click="store.refresh"
          >
            刷新
          </el-button>
          <el-button
            v-permission="PERMS.wallet.recharge"
            type="primary"
            :icon="Upload"
            @click="openRecharge"
          >
            充值
          </el-button>
        </div>
      </div>
      <app-data-table
        :data="transactions"
        :loading="loading"
        :min-width="900"
        table-class="wallet-table"
      >
        <el-table-column
          label="流水类型"
          min-width="170"
        >
          <template #default="{ row }">
            <div class="wallet-type">
              <span
                class="wallet-type__icon"
                :class="row.direction === FundDirection.In ? 'is-in' : 'is-out'"
              >
                <el-icon>
                  <Upload v-if="row.direction === FundDirection.In" />
                  <Download v-else />
                </el-icon>
              </span>
              <div>
                <strong>{{ txnTypeText[row.type as WalletTxnType] }}</strong>
                <small>{{ row.bizOrderId ?? '系统流水' }}</small>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="资金方向"
          width="120"
        >
          <template #default="{ row }">
            <el-tag
              round
              :type="row.direction === FundDirection.In ? 'success' : 'danger'"
              effect="light"
            >
              {{ row.direction === FundDirection.In ? '入账' : '出账' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="金额（元）"
          width="150"
        >
          <template #default="{ row }">
            <span :class="row.direction === FundDirection.In ? 'amount-in' : 'amount-out'">
              {{ row.direction === FundDirection.In ? '+' : '-' }}{{ row.amountYuan }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="变更后余额（元）"
          width="170"
        >
          <template #default="{ row }">
            <span class="wallet-balance-after">{{ row.balanceAfterYuan }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="备注"
          prop="remark"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column
          label="时间"
          width="190"
        >
          <template #default="{ row }">
            <span class="wallet-date">{{ new Date(row.createdAt).toLocaleString() }}</span>
          </template>
        </el-table-column>
      </app-data-table>
      <div class="wallet-pager">
        <span>共 {{ total }} 条流水</span>
        <el-pagination
          layout="prev, pager, next"
          :total="total"
          :current-page="page"
          :page-size="pageSize"
          @current-change="store.changePage"
        />
      </div>
    </section>

    <section class="wallet-actions-panel">
      <button
        v-permission="PERMS.wallet.recharge"
        type="button"
        class="wallet-action"
        @click="openRecharge"
      >
        <span class="wallet-action__icon">
          <el-icon><Money /></el-icon>
        </span>
        <strong>扫码充值</strong>
        <small>生成支付宝或微信支付二维码</small>
      </button>
      <button
        v-permission="PERMS.wallet.withdraw"
        type="button"
        class="wallet-action"
        @click="openWithdraw"
      >
        <span class="wallet-action__icon is-withdraw">
          <el-icon><CreditCard /></el-icon>
        </span>
        <strong>账户提现</strong>
        <small>提交支付宝到账信息并发起打款</small>
      </button>
      <button
        type="button"
        class="wallet-action"
        @click="store.refresh"
      >
        <span class="wallet-action__icon is-refresh">
          <el-icon><TrendCharts /></el-icon>
        </span>
        <strong>同步余额</strong>
        <small>刷新钱包、统计和当前流水分页</small>
      </button>
    </section>

    <el-dialog
      v-model="rechargeVisible"
      title="账户充值"
      width="460px"
      class="wallet-dialog"
    >
      <template v-if="!rechargeQr">
        <div class="wallet-dialog__intro">
          <span>
            <el-icon><CircleCheck /></el-icon>
          </span>
          <p>充值订单生成后，请使用对应渠道扫码完成支付。</p>
        </div>
        <el-form
          label-position="top"
          class="wallet-form"
        >
          <el-form-item label="充值金额">
            <div class="wallet-number-field">
              <el-input-number
                v-model="rechargeForm.amountYuan"
                :min="0.01"
                :precision="2"
                :step="1"
              />
              <span class="form-unit">元</span>
            </div>
          </el-form-item>
          <el-form-item label="支付方式">
            <el-radio-group v-model="rechargeForm.provider">
              <el-radio-button :value="PaymentProvider.Alipay">
                支付宝
              </el-radio-button>
              <el-radio-button :value="PaymentProvider.Wechat">
                微信支付
              </el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </template>
      <div
        v-else
        class="qr-block"
      >
        <img
          :src="rechargeQr"
          alt="支付二维码"
          class="qr-image"
        >
        <p>请使用{{ rechargeForm.provider === PaymentProvider.Alipay ? '支付宝' : '微信' }}扫码支付</p>
      </div>
      <template #footer>
        <el-button @click="rechargeVisible = false">
          关闭
        </el-button>
        <el-button
          v-if="!rechargeQr"
          type="primary"
          :loading="rechargeSubmitting"
          @click="submitRecharge"
        >
          生成支付二维码
        </el-button>
        <el-button
          v-else
          type="primary"
          @click="confirmPaid"
        >
          我已支付
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="withdrawVisible"
      title="账户提现"
      width="460px"
      class="wallet-dialog"
    >
      <div class="wallet-dialog__intro">
        <span>
          <el-icon><CreditCard /></el-icon>
        </span>
        <p>请确认收款账号和真实姓名准确无误，提交后将进入打款流程。</p>
      </div>
      <el-form
        label-position="top"
        class="wallet-form"
      >
        <el-form-item label="提现金额">
          <div class="wallet-number-field">
            <el-input-number
              v-model="withdrawForm.amountYuan"
              :min="0.01"
              :precision="2"
              :step="1"
            />
            <span class="form-unit">元</span>
          </div>
        </el-form-item>
        <el-form-item label="到账方式">
          <el-radio-group v-model="withdrawForm.provider">
            <el-radio-button :value="PayoutProvider.Alipay">
              支付宝
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="支付宝账号">
          <el-input
            v-model="withdrawForm.account"
            placeholder="收款支付宝登录号（邮箱/手机号）"
          />
        </el-form-item>
        <el-form-item label="真实姓名">
          <el-input
            v-model="withdrawForm.accountName"
            placeholder="收款人真实姓名"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="withdrawVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="withdrawSubmitting"
          @click="submitWithdraw"
        >
          确认提现
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>
