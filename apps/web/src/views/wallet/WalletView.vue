<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import {
  PaymentProvider,
  PayoutProvider,
  WalletTxnType,
  FundDirection,
  WithdrawalStatus,
} from '@app/contracts';
import { ElMessage } from 'element-plus';
import { Money, Wallet, Upload, Download } from '@element-plus/icons-vue';
import QRCode from 'qrcode';
import { storeToRefs } from 'pinia';
import { useWalletStore } from '@/stores/wallet.store';
import { walletApi } from '@/api/wallet.api';
import './WalletView.css';

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
      <div class="hero-balance">
        <span class="hero-label">
          <el-icon><Wallet /></el-icon>
          账户余额（元）
        </span>
        <strong class="hero-amount">{{ wallet?.balanceYuan ?? '0.00' }}</strong>
        <div class="hero-actions">
          <el-button
            type="primary"
            :icon="Upload"
            @click="openRecharge"
          >
            充值
          </el-button>
          <el-button
            :icon="Download"
            @click="openWithdraw"
          >
            提现
          </el-button>
        </div>
      </div>
    </header>

    <section class="stat-grid">
      <article class="stat-card">
        <span>累计充值（元）</span>
        <strong>{{ stats?.totalRechargeYuan ?? '0.00' }}</strong>
        <small>{{ stats?.rechargeCount ?? 0 }} 笔</small>
      </article>
      <article class="stat-card">
        <span>累计提现（元）</span>
        <strong>{{ stats?.totalWithdrawYuan ?? '0.00' }}</strong>
        <small>{{ stats?.withdrawCount ?? 0 }} 笔</small>
      </article>
      <article class="stat-card">
        <span>账户状态</span>
        <strong>{{ wallet?.status === 'active' ? '正常' : '冻结' }}</strong>
        <small>所有角色通用钱包</small>
      </article>
    </section>

    <section class="panel">
      <div class="panel-heading">
        <h2>
          <el-icon><Money /></el-icon>
          收支明细
        </h2>
      </div>
      <el-table
        :data="transactions"
        stripe
      >
        <el-table-column
          label="类型"
          width="100"
        >
          <template #default="{ row }">
            {{ txnTypeText[row.type as WalletTxnType] }}
          </template>
        </el-table-column>
        <el-table-column
          label="金额（元）"
          width="160"
        >
          <template #default="{ row }">
            <span :class="row.direction === FundDirection.In ? 'amount-in' : 'amount-out'">
              {{ row.direction === FundDirection.In ? '+' : '-' }}{{ row.amountYuan }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="变更后余额（元）"
          width="160"
          prop="balanceAfterYuan"
        />
        <el-table-column
          label="备注"
          prop="remark"
          min-width="160"
        />
        <el-table-column
          label="时间"
          width="200"
        >
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
      </el-table>
      <div class="pager">
        <el-pagination
          layout="total, prev, pager, next"
          :total="total"
          :current-page="page"
          :page-size="pageSize"
          @current-change="store.changePage"
        />
      </div>
    </section>

    <el-dialog
      v-model="rechargeVisible"
      title="账户充值"
      width="420px"
    >
      <template v-if="!rechargeQr">
        <el-form label-width="90px">
          <el-form-item label="充值金额">
            <el-input-number
              v-model="rechargeForm.amountYuan"
              :min="0.01"
              :precision="2"
              :step="1"
            />
            <span class="form-unit">元</span>
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
      width="420px"
    >
      <el-form label-width="100px">
        <el-form-item label="提现金额">
          <el-input-number
            v-model="withdrawForm.amountYuan"
            :min="0.01"
            :precision="2"
            :step="1"
          />
          <span class="form-unit">元</span>
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
