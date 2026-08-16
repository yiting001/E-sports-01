import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AdminOrderView, OrderPaymentMethod } from '@app/contracts';
import { RefundResolver } from '../../../wallet/application/refund.resolver';
import {
  RefundExecutionResult,
  RefundExecutionStatus,
  RefundOutcomeUnknownError,
  RefundPort,
} from '../../../wallet/domain/refund-port.interface';
import { buildOrderNo } from '../../../wallet/application/order-no.util';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/order-repository.interface';
import {
  BeginOrderRefundResult,
  ORDER_REFUND_TRANSACTION,
  OrderRefundBundle,
  OrderRefundTransaction,
} from '../../domain/order-refund-transaction.interface';
import { canApproveOrderRefund } from '../../domain/order-refund.rules';
import { OrderGroupService } from '../order-group.service';
import { toAdminOrderView } from '../order.mapper';
import { toRefundProvider } from '../order-payment-method';
import { ServiceAgentScope } from '../service-agent-scope.service';

/** 审核通过并执行原路退款；处理中查询当前尝试，明确失败后使用新渠道号重试。 */
@Injectable()
export class ApproveOrderRefundUseCase {
  private readonly logger = new Logger(ApproveOrderRefundUseCase.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    @Inject(ORDER_REFUND_TRANSACTION)
    private readonly refunds: OrderRefundTransaction,
    private readonly refundResolver: RefundResolver,
    private readonly scope: ServiceAgentScope,
    private readonly orderGroup: OrderGroupService,
  ) {}

  async execute(reviewerId: string, orderId: string): Promise<AdminOrderView> {
    const order = await this.orders.findById(orderId);
    if (!order || !order.refund) {
      throw new NotFoundException('退款申请不存在');
    }
    await this.scope.assertCanHandle(reviewerId, order);
    let channelPort: RefundPort | null = null;
    if (
      canApproveOrderRefund(order.refund.status) &&
      order.refund.paymentMethod !== OrderPaymentMethod.Balance &&
      order.refund.amountFen > 0
    ) {
      const provider = toRefundProvider(order.refund.paymentMethod);
      if (!provider) {
        throw new BadRequestException('退款支付方式不受支持');
      }
      channelPort = this.refundResolver.resolve(provider);
      try {
        await channelPort.assertReady();
      } catch (error: unknown) {
        const latest = await this.orders.findById(orderId);
        if (!latest?.refund || canApproveOrderRefund(latest.refund.status)) {
          throw error;
        }
        channelPort = null;
      }
    }
    const begun = await this.refunds.begin({
      tenantId: order.tenantId,
      orderId: order.id,
      reviewerId,
      channelRefundNo:
        order.refund.paymentMethod !== OrderPaymentMethod.Balance && order.refund.amountFen > 0
          ? buildOrderNo('RF')
          : '',
    });
    if (begun.outcome === 'not_found') {
      throw new NotFoundException('退款申请不存在');
    }
    if (begun.outcome === 'invalid_status') {
      throw new BadRequestException('该退款申请当前不可审核');
    }
    if (begun.outcome === 'already_succeeded') {
      return toAdminOrderView(begun.order);
    }
    if (begun.refund.paymentMethod === OrderPaymentMethod.Balance || begun.refund.amountFen === 0) {
      return this.completeInternal(begun);
    }
    return this.executeChannelRefund(begun, channelPort);
  }

  private async completeInternal(bundle: OrderRefundBundle): Promise<AdminOrderView> {
    const prefix =
      bundle.refund.paymentMethod === OrderPaymentMethod.Balance ? 'BALANCE-' : 'ZERO-';
    const result = await this.refunds.complete({
      tenantId: bundle.order.tenantId,
      refundId: bundle.refund.id,
      channelRefundNo: '',
      providerRefundNo: `${prefix}${bundle.refund.refundNo}`,
    });
    if (result.outcome === 'not_found' || result.outcome === 'invalid_status') {
      throw new BadRequestException('退款状态已变化，请刷新后重试');
    }
    await this.orderGroup.syncTitle(result.order);
    return toAdminOrderView(result.order);
  }

  private async executeChannelRefund(
    begun: Exclude<BeginOrderRefundResult, { outcome: 'not_found' | 'invalid_status' }>,
    port: RefundPort | null,
  ): Promise<AdminOrderView> {
    const paymentProvider = toRefundProvider(begun.refund.paymentMethod);
    if (!paymentProvider || !port || port.provider !== paymentProvider) {
      throw new BadRequestException('退款支付方式不受支持');
    }
    if (!begun.refund.channelRefundNo) {
      throw new BadRequestException('退款渠道尝试号缺失，请联系管理员');
    }
    let channelResult: RefundExecutionResult;
    try {
      const createInput = {
        outTradeNo: begun.order.orderNo,
        outRefundNo: begun.refund.channelRefundNo,
        totalAmountFen: begun.order.amountFen,
        refundAmountFen: begun.refund.amountFen,
        reason: begun.refund.reason,
        notifyUrl: '',
      };
      if (begun.outcome === 'already_processing') {
        channelResult = await port.queryRefund({
          outTradeNo: begun.order.orderNo,
          outRefundNo: begun.refund.channelRefundNo,
          totalAmountFen: begun.order.amountFen,
          refundAmountFen: begun.refund.amountFen,
        });
        if (channelResult.status === RefundExecutionStatus.NotFound) {
          channelResult = await port.createRefund(createInput);
        }
      } else {
        channelResult = await port.createRefund(createInput);
      }
    } catch (error: unknown) {
      if (!(error instanceof RefundOutcomeUnknownError)) {
        throw error;
      }
      this.logger.warn(
        `退款渠道结果未知，保留处理中状态 provider=${paymentProvider} error=${error.name}`,
      );
      return toAdminOrderView(begun.order);
    }
    return this.applyChannelResult(begun, channelResult);
  }

  private async applyChannelResult(
    bundle: OrderRefundBundle,
    result: RefundExecutionResult,
  ): Promise<AdminOrderView> {
    if (result.status === RefundExecutionStatus.Succeeded) {
      const completed = await this.refunds.complete({
        tenantId: bundle.order.tenantId,
        refundId: bundle.refund.id,
        channelRefundNo: bundle.refund.channelRefundNo,
        providerRefundNo: result.providerRefundNo || bundle.refund.channelRefundNo,
      });
      if (completed.outcome === 'not_found' || completed.outcome === 'invalid_status') {
        throw new BadRequestException('退款状态已变化，请刷新后重试');
      }
      await this.orderGroup.syncTitle(completed.order);
      return toAdminOrderView(completed.order);
    }
    if (result.status === RefundExecutionStatus.Processing) {
      const recorded = await this.refunds.recordChannelResult({
        tenantId: bundle.order.tenantId,
        refundId: bundle.refund.id,
        channelRefundNo: bundle.refund.channelRefundNo,
        providerRefundNo: result.providerRefundNo,
      });
      if (recorded.outcome === 'not_found' || recorded.outcome === 'invalid_status') {
        throw new BadRequestException('退款状态已变化，请刷新后重试');
      }
      return toAdminOrderView(recorded.order);
    }
    if (result.status === RefundExecutionStatus.NotFound) {
      return toAdminOrderView(bundle.order);
    }
    return this.markFailed(bundle, result.providerRefundNo, result.failReason || '渠道退款失败');
  }

  private async markFailed(
    bundle: OrderRefundBundle,
    providerRefundNo: string,
    reason: string,
  ): Promise<AdminOrderView> {
    const failed = await this.refunds.fail({
      tenantId: bundle.order.tenantId,
      refundId: bundle.refund.id,
      channelRefundNo: bundle.refund.channelRefundNo,
      providerRefundNo,
      reason,
    });
    if (failed) {
      return toAdminOrderView(failed.order);
    }
    const latest = await this.orders.findById(bundle.order.id);
    if (!latest) {
      throw new NotFoundException('订单不存在');
    }
    return toAdminOrderView(latest);
  }
}
