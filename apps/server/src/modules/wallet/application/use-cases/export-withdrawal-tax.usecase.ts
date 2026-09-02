import { Inject, Injectable } from '@nestjs/common';
import {
  PAYOUT_PROVIDER_TEXT,
  WithdrawalStatus,
  WithdrawalTaxExportView,
  fenToYuan,
} from '@app/contracts';
import {
  WITHDRAWAL_ORDER_REPOSITORY,
  WithdrawalOrderRepository,
} from '../../domain/withdrawal-repository.interface';
import { WithdrawalOrderEntity } from '../../domain/withdrawal-order.entity';

/** 报税表单列头（与行字段一一对应） */
const TAX_CSV_HEADERS = [
  '序号',
  '姓名',
  '身份证号',
  '收款账号',
  '提现金额(元)',
  '税费(元)',
  '到账金额(元)',
  '提现单号',
  '渠道转账单号',
  '申请时间',
  '提现渠道',
  '上游转账单号',
  '渠道手续费(元)',
] as const;

/** CSV 字段转义：含分隔符/引号/换行时加引号包裹 */
function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * 用例：财务一键导出报税表单（CSV）。
 * 仅导出「已到账」的提现单（税费已实际扣收），含收款人姓名/身份证号/金额/税费，
 * 尾部附执行渠道、上游转账单号与渠道手续费（商户承担，供财务核对渠道对账单）；
 * 返回 CSV 正文由前端生成文件下载（加 UTF-8 BOM 保证 Excel 中文不乱码）。
 */
@Injectable()
export class ExportWithdrawalTaxUseCase {
  constructor(
    @Inject(WITHDRAWAL_ORDER_REPOSITORY)
    private readonly withdrawalRepo: WithdrawalOrderRepository,
  ) {}

  async execute(): Promise<WithdrawalTaxExportView> {
    const orders = await this.withdrawalRepo.listByStatus(
      WithdrawalStatus.Success,
    );
    const rows = orders.map((order, index) => this.toRow(order, index + 1));
    const csv = [TAX_CSV_HEADERS.join(','), ...rows].join('\n');
    const date = new Date().toISOString().slice(0, 10);
    return {
      filename: `提现报税表单-${date}.csv`,
      csv,
      count: orders.length,
    };
  }

  private toRow(order: WithdrawalOrderEntity, seq: number): string {
    return [
      String(seq),
      order.accountName,
      order.idCardNo ?? '',
      order.account,
      fenToYuan(order.amountFen),
      fenToYuan(order.feeFen),
      fenToYuan(order.amountFen - order.feeFen),
      order.outBizNo,
      order.providerOrderId ?? '',
      order.createdAt.toISOString(),
      PAYOUT_PROVIDER_TEXT[order.provider],
      order.channelOrderNo ?? '',
      fenToYuan(order.channelFeeFen),
    ]
      .map(escapeCsvField)
      .join(',');
  }
}
