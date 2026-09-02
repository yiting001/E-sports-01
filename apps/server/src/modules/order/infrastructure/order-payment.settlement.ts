import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  FundDirection,
  OrderPaymentMethod,
  OrderStatus,
  WalletStatus,
  WalletTxnType,
} from '@app/contracts';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { ProductEntity } from '../../commerce/domain/product.entity';
import {
  MEMBER_SPEND_TRANSACTION_PARTICIPANT,
  MemberSpendTransactionParticipant,
} from '../../member/infrastructure/member-spend-transaction.participant';
import { WalletEntity } from '../../wallet/domain/wallet.entity';
import { WalletTransactionEntity } from '../../wallet/domain/wallet-transaction.entity';
import {
  OrderPaymentSettlement,
  SettleBalancePaymentInput,
  SettleOrderPaymentInput,
} from '../domain/order-payment-settlement.interface';
import { OrderEntity } from '../domain/order.entity';

const BALANCE_TRADE_PREFIX = 'BALANCE-';

/** TypeORM 订单支付事务实现，统一收敛订单、钱包、流水与销量的一致性边界。 */
@Injectable()
export class TypeormOrderPaymentSettlement implements OrderPaymentSettlement {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(MEMBER_SPEND_TRANSACTION_PARTICIPANT)
    private readonly memberSpend: MemberSpendTransactionParticipant,
  ) {}

  settle(input: SettleOrderPaymentInput): Promise<OrderEntity | null> {
    return this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(OrderEntity);
      const order = await orderRepo.findOne({
        where: { orderNo: input.orderNo },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order || order.provider !== input.method || order.amountFen !== input.paidAmountFen) {
        return null;
      }
      if (order.status !== OrderStatus.PendingPayment) {
        return null;
      }

      await this.increaseProductSales(manager, order);
      await this.recordMemberSpend(manager, order);
      this.markOrderPaid(order, input.providerTradeNo);
      order.channelFeeFen = input.channelFeeFen ?? 0;
      await orderRepo.save(order);
      return order;
    });
  }

  settleBalance(input: SettleBalancePaymentInput): Promise<OrderEntity | null> {
    return this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(OrderEntity);
      const order = await orderRepo.findOne({
        where: { id: input.orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order || order.userId !== input.userId) {
        throw new NotFoundException('订单不存在');
      }
      if (order.provider !== OrderPaymentMethod.Balance) {
        throw new BadRequestException('订单支付方式不匹配');
      }
      if (input.paidAmountFen <= 0 || order.amountFen !== input.paidAmountFen) {
        throw new BadRequestException('订单支付金额不匹配');
      }
      if (order.status === OrderStatus.PendingService) {
        return null;
      }
      if (order.status !== OrderStatus.PendingPayment) {
        throw new BadRequestException('订单当前状态不可支付');
      }

      const walletRepo = manager.getRepository(WalletEntity);
      const wallet = await walletRepo.findOne({
        where: { tenantId: order.tenantId, userId: input.userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) {
        throw new BadRequestException('钱包未开通，无法使用余额支付');
      }
      if (wallet.status !== WalletStatus.Active) {
        throw new BadRequestException('钱包已冻结，暂不可支付');
      }
      if (wallet.balanceFen < input.paidAmountFen) {
        throw new BadRequestException('钱包余额不足');
      }

      wallet.balanceFen -= input.paidAmountFen;
      await walletRepo.save(wallet);
      const transaction = manager.getRepository(WalletTransactionEntity).create({
        tenantId: order.tenantId,
        walletId: wallet.id,
        type: WalletTxnType.OrderPayment,
        direction: FundDirection.Out,
        amountFen: input.paidAmountFen,
        balanceAfterFen: wallet.balanceFen,
        bizOrderId: order.id,
        remark: `订单余额支付：${order.orderNo}`,
      });
      await manager.getRepository(WalletTransactionEntity).save(transaction);

      await this.increaseProductSales(manager, order);
      await this.recordMemberSpend(manager, order);
      this.markOrderPaid(order, `${BALANCE_TRADE_PREFIX}${order.id}`);
      await orderRepo.save(order);
      return order;
    });
  }

  private markOrderPaid(order: OrderEntity, providerTradeNo: string): void {
    order.status = OrderStatus.PendingService;
    order.providerTradeNo = providerTradeNo;
    order.paidAt = new Date();
  }

  private async recordMemberSpend(manager: EntityManager, order: OrderEntity): Promise<void> {
    if (order.amountFen <= 0) {
      order.memberSpendRecorded = false;
      return;
    }
    await this.memberSpend.record(manager, {
      tenantId: order.tenantId,
      userId: order.userId,
      amountFen: order.amountFen,
    });
    order.memberSpendRecorded = true;
  }

  private async increaseProductSales(manager: EntityManager, order: OrderEntity): Promise<void> {
    await manager
      .getRepository(ProductEntity)
      .increment({ id: order.productId, tenantId: order.tenantId }, 'sold', order.quantity);
  }
}
