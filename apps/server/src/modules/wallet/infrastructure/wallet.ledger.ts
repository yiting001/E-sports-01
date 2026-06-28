import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  FundDirection,
  RechargeStatus,
  WalletStatus,
  WalletTxnType,
  WithdrawalStatus,
} from '@app/contracts';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { WalletEntity } from '../domain/wallet.entity';
import { WalletTransactionEntity } from '../domain/wallet-transaction.entity';
import { RechargeOrderEntity } from '../domain/recharge-order.entity';
import { WithdrawalOrderEntity } from '../domain/withdrawal-order.entity';
import {
  CreditRechargeInput,
  ReserveWithdrawalInput,
  WalletLedger,
} from '../domain/ledger.interface';

/**
 * 钱包账务单元的 TypeORM 实现（唯一余额写入口）。
 * 所有余额变更都在事务内对钱包行加悲观写锁后进行，并同步写入流水，
 * 杜绝并发下的脏写与「改了余额没记流水/记了流水没改余额」的不一致。
 */
@Injectable()
export class TypeormWalletLedger implements WalletLedger {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async creditRecharge(input: CreditRechargeInput): Promise<boolean> {
    return this.dataSource.transaction(async (m) => {
      const order = await m.getRepository(RechargeOrderEntity).findOne({
        where: { outTradeNo: input.outTradeNo },
      });
      if (!order || order.amountFen !== input.paidAmountFen) {
        return false;
      }
      if (order.status === RechargeStatus.Paid) {
        return true;
      }
      const wallet = await this.lockWallet(m, order.walletId);
      if (!wallet) {
        return false;
      }
      wallet.balanceFen += input.paidAmountFen;
      wallet.totalRechargeFen += input.paidAmountFen;
      await m.getRepository(WalletEntity).save(wallet);
      order.status = RechargeStatus.Paid;
      order.providerTradeNo = input.providerTradeNo;
      await m.getRepository(RechargeOrderEntity).save(order);
      await this.appendTxn(m, {
        wallet,
        type: WalletTxnType.Recharge,
        direction: FundDirection.In,
        amountFen: input.paidAmountFen,
        bizOrderId: order.id,
        remark: '充值入账',
      });
      return true;
    });
  }

  async reserveWithdrawal(
    input: ReserveWithdrawalInput,
  ): Promise<WithdrawalOrderEntity> {
    return this.dataSource.transaction(async (m) => {
      const wallet = await this.lockWallet(m, input.walletId);
      if (!wallet) {
        throw new NotFoundException('钱包不存在');
      }
      if (wallet.status !== WalletStatus.Active) {
        throw new BadRequestException('钱包已冻结，暂不可提现');
      }
      if (wallet.balanceFen < input.amountFen) {
        throw new BadRequestException('余额不足');
      }
      wallet.balanceFen -= input.amountFen;
      await m.getRepository(WalletEntity).save(wallet);
      const order = m.getRepository(WithdrawalOrderEntity).create({
        tenantId: wallet.tenantId,
        walletId: wallet.id,
        outBizNo: input.outBizNo,
        amountFen: input.amountFen,
        provider: input.provider,
        status: WithdrawalStatus.Processing,
        account: input.account,
        accountName: input.accountName,
        providerOrderId: null,
        failReason: null,
      });
      const saved = await m.getRepository(WithdrawalOrderEntity).save(order);
      await this.appendTxn(m, {
        wallet,
        type: WalletTxnType.Withdraw,
        direction: FundDirection.Out,
        amountFen: input.amountFen,
        bizOrderId: saved.id,
        remark: '提现冻结扣减',
      });
      return saved;
    });
  }

  async markWithdrawalSuccess(
    orderId: string,
    providerOrderId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (m) => {
      const order = await m.getRepository(WithdrawalOrderEntity).findOne({
        where: { id: orderId },
      });
      if (!order || order.status !== WithdrawalStatus.Processing) {
        return;
      }
      order.status = WithdrawalStatus.Success;
      order.providerOrderId = providerOrderId;
      await m.getRepository(WithdrawalOrderEntity).save(order);
      const wallet = await this.lockWallet(m, order.walletId);
      if (wallet) {
        wallet.totalWithdrawFen += order.amountFen;
        await m.getRepository(WalletEntity).save(wallet);
      }
    });
  }

  async refundWithdrawal(orderId: string, reason: string): Promise<void> {
    await this.dataSource.transaction(async (m) => {
      const order = await m.getRepository(WithdrawalOrderEntity).findOne({
        where: { id: orderId },
      });
      if (!order || order.status !== WithdrawalStatus.Processing) {
        return;
      }
      const wallet = await this.lockWallet(m, order.walletId);
      if (wallet) {
        wallet.balanceFen += order.amountFen;
        await m.getRepository(WalletEntity).save(wallet);
        await this.appendTxn(m, {
          wallet,
          type: WalletTxnType.Withdraw,
          direction: FundDirection.In,
          amountFen: order.amountFen,
          bizOrderId: order.id,
          remark: `提现失败退款：${reason}`,
        });
      }
      order.status = WithdrawalStatus.Failed;
      order.failReason = reason.slice(0, 255);
      await m.getRepository(WithdrawalOrderEntity).save(order);
    });
  }

  /** 事务内对钱包行加悲观写锁后读取 */
  private lockWallet(
    m: EntityManager,
    walletId: string,
  ): Promise<WalletEntity | null> {
    return m.getRepository(WalletEntity).findOne({
      where: { id: walletId },
      lock: { mode: 'pessimistic_write' },
    });
  }

  /** 追加一条流水，余额快照取自已变更的钱包；显式带上租户以适配无请求上下文的回调 */
  private async appendTxn(
    m: EntityManager,
    params: {
      wallet: WalletEntity;
      type: WalletTxnType;
      direction: FundDirection;
      amountFen: number;
      bizOrderId: string;
      remark: string;
    },
  ): Promise<void> {
    const txn = m.getRepository(WalletTransactionEntity).create({
      tenantId: params.wallet.tenantId,
      walletId: params.wallet.id,
      type: params.type,
      direction: params.direction,
      amountFen: params.amountFen,
      balanceAfterFen: params.wallet.balanceFen,
      bizOrderId: params.bizOrderId,
      remark: params.remark,
    });
    await m.getRepository(WalletTransactionEntity).save(txn);
  }
}
