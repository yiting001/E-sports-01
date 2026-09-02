import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { RechargeStatus } from '@app/contracts';
import { walletApi } from '@/api/wallet.api';
import { useToast } from '@/composables/use-toast';
import { readPayReturnRef, stripPayReturnQuery } from '@/utils/pay-return';

export interface PayReturnRechargePorts {
  rechargeStatus(outTradeNo: string): Promise<{ status: RechargeStatus }>;
}

export type PayReturnRechargeResult = 'paid' | 'pending' | 'closed' | 'error';

/** 回跳后向服务端确认充值单状态；跳转参数本身不作为入账依据 */
export async function confirmRechargeReturn(
  outTradeNo: string,
  ports: PayReturnRechargePorts,
): Promise<PayReturnRechargeResult> {
  try {
    const { status } = await ports.rechargeStatus(outTradeNo);
    if (status === RechargeStatus.Paid) {
      return 'paid';
    }
    return status === RechargeStatus.Closed ? 'closed' : 'pending';
  } catch {
    return 'error';
  }
}

const RESULT_TEXT: Record<Exclude<PayReturnRechargeResult, 'paid'>, string> = {
  pending: '充值结果确认中，已付款请稍后刷新余额',
  closed: '充值已关闭，如已扣款请联系客服',
  error: '充值结果查询失败，请刷新页面重试',
};

/**
 * 发起充值的页面（钱包页、结算页）挂载时消费支付渠道同步跳回带回的充值单号：
 * 先清理回跳 query 避免刷新重复触发，再以服务端查单结果为准；
 * 已入账时复用页面原有的充值成功处理（刷新余额/流水），其余状态仅提示。
 */
export function usePayReturnRecharge(onPaid: () => Promise<void> | void): void {
  const route = useRoute();
  const router = useRouter();
  const toast = useToast();

  onMounted(async () => {
    const outTradeNo = readPayReturnRef(route.query);
    if (!outTradeNo) {
      return;
    }
    void router.replace({ query: stripPayReturnQuery(route.query) });
    const result = await confirmRechargeReturn(outTradeNo, {
      rechargeStatus: (no) => walletApi.rechargeStatus(no, { silent: true }),
    });
    if (result === 'paid') {
      await onPaid();
    } else {
      toast.show(RESULT_TEXT[result]);
    }
  });
}
