import assert from 'node:assert/strict';
import test from 'node:test';
import {
  OrderPaymentMethod,
  OrderRefundStatus,
  OrderStatus,
  PaymentProvider,
} from '@app/contracts';
import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import type { RefundResolver } from '../../src/modules/wallet/application/refund.resolver';
import {
  RefundExecutionStatus,
  RefundOutcomeUnknownError,
} from '../../src/modules/wallet/domain/refund-port.interface';
import type { OrderGroupService } from '../../src/modules/order/application/order-group.service';
import { RejectOrderRefundUseCase } from '../../src/modules/order/application/use-cases/reject-order-refund.usecase';
import { RequestOrderRefundUseCase } from '../../src/modules/order/application/use-cases/request-order-refund.usecase';
import type { OrderRefundTransaction } from '../../src/modules/order/domain/order-refund-transaction.interface';
import {
  approveUseCase,
  makeOrder,
  makeRefund,
  makeReviewingOrder,
  refundPort,
  repositoryFor,
  resolverFor,
  scopeAllowing,
  transactionHarness,
} from './order-refund-usecase.fixture';

test('本人申请退款后冻结履约并同步群标题', async () => {
  const order = makeOrder();
  let synchronized = 0;
  const transactions = {
    request: async (input: { refundNo: string; reason: string }) => {
      assert.match(input.refundNo, /^R\d+$/);
      assert.equal(input.reason, '临时无法继续服务');
      order.status = OrderStatus.RefundReviewing;
      const refund = makeRefund(order, OrderRefundStatus.PendingReview);
      order.refund = refund;
      return { outcome: 'created' as const, order, refund };
    },
  } as unknown as OrderRefundTransaction;
  const useCase = new RequestOrderRefundUseCase(repositoryFor(order), transactions, {
    syncTitle: async () => {
      synchronized += 1;
    },
  } as unknown as OrderGroupService);

  const result = await useCase.execute(order.userId, order.id, '临时无法继续服务');

  assert.equal(result.status, OrderStatus.RefundReviewing);
  assert.equal(result.refund?.status, OrderRefundStatus.PendingReview);
  assert.equal(result.canRequestRefund, false);
  assert.equal(synchronized, 1);
});

test('非本人、已开工或已有申请不能重复申请退款', async () => {
  const order = makeOrder();
  const useCase = new RequestOrderRefundUseCase(
    repositoryFor(order),
    {} as OrderRefundTransaction,
    {} as OrderGroupService,
  );
  await assert.rejects(useCase.execute('other-user', order.id, '原因'), /订单不存在/);
  order.status = OrderStatus.Serving;
  await assert.rejects(useCase.execute(order.userId, order.id, '原因'), /尚未开始服务/);
  order.status = OrderStatus.RefundReviewing;
  order.refund = makeRefund(order, OrderRefundStatus.PendingReview);
  await assert.rejects(useCase.execute(order.userId, order.id, '原因'), /已提交过退款申请/);
});

test('余额退款审核通过直接完成，不调用外部渠道', async () => {
  const order = makeReviewingOrder(OrderPaymentMethod.Balance);
  let completed = 0;
  const transactions = transactionHarness(order, {
    complete: async (providerRefundNo) => {
      completed += 1;
      assert.match(providerRefundNo, /^BALANCE-/);
    },
  });
  const useCase = approveUseCase(order, transactions, {
    resolve: () => {
      throw new Error('余额退款不应调用渠道');
    },
  } as unknown as RefundResolver);

  const result = await useCase.execute('reviewer-1', order.id);

  assert.equal(result.status, OrderStatus.Refunded);
  assert.equal(result.refund?.status, OrderRefundStatus.Succeeded);
  assert.equal(completed, 1);
});

test('渠道退款已成功后即使凭证失效，重复审批仍幂等返回终态', async () => {
  const order = makeReviewingOrder(OrderPaymentMethod.Alipay);
  order.status = OrderStatus.Refunded;
  order.refund.status = OrderRefundStatus.Succeeded;
  const port = refundPort(
    undefined,
    undefined,
    new ServiceUnavailableException('支付宝凭证已移除'),
  );

  const result = await approveUseCase(order, transactionHarness(order), resolverFor(port)).execute(
    'reviewer-1',
    order.id,
  );

  assert.equal(result.status, OrderStatus.Refunded);
  assert.equal(result.refund?.status, OrderRefundStatus.Succeeded);
});

test('支付宝审核成功后才标记已退款，渠道处理中保持冻结', async () => {
  const successOrder = makeReviewingOrder(OrderPaymentMethod.Alipay);
  const successPort = refundPort({
    status: RefundExecutionStatus.Succeeded,
    providerRefundNo: 'alipay-refund-1',
    failReason: '',
  });
  const succeeded = await approveUseCase(
    successOrder,
    transactionHarness(successOrder),
    resolverFor(successPort),
  ).execute('reviewer-1', successOrder.id);
  assert.equal(succeeded.status, OrderStatus.Refunded);
  assert.equal(succeeded.refund?.status, OrderRefundStatus.Succeeded);

  const processingOrder = makeReviewingOrder(OrderPaymentMethod.Alipay);
  const processingPort = refundPort({
    status: RefundExecutionStatus.Processing,
    providerRefundNo: 'alipay-refund-2',
    failReason: '',
  });
  const processing = await approveUseCase(
    processingOrder,
    transactionHarness(processingOrder),
    resolverFor(processingPort),
  ).execute('reviewer-1', processingOrder.id);
  assert.equal(processing.status, OrderStatus.RefundReviewing);
  assert.equal(processing.refund?.status, OrderRefundStatus.Processing);
});

test('渠道超时保持处理中，明确失败才进入可重试失败态', async () => {
  const timeoutOrder = makeReviewingOrder(OrderPaymentMethod.Wechat);
  const timeoutPort = refundPort(
    undefined,
    new RefundOutcomeUnknownError('timeout'),
    undefined,
    PaymentProvider.Wechat,
  );
  const timeout = await approveUseCase(
    timeoutOrder,
    transactionHarness(timeoutOrder),
    resolverFor(timeoutPort),
  ).execute('reviewer-1', timeoutOrder.id);
  assert.equal(timeout.refund?.status, OrderRefundStatus.Processing);

  const failedOrder = makeReviewingOrder(OrderPaymentMethod.Wechat);
  const failedPort = refundPort(
    {
      status: RefundExecutionStatus.Failed,
      providerRefundNo: '',
      failReason: '退款账户状态异常',
    },
    undefined,
    undefined,
    PaymentProvider.Wechat,
  );
  const failed = await approveUseCase(
    failedOrder,
    transactionHarness(failedOrder),
    resolverFor(failedPort),
  ).execute('reviewer-1', failedOrder.id);
  assert.equal(failed.refund?.status, OrderRefundStatus.Failed);
  assert.equal(failed.refund?.failReason, '退款账户状态异常');
});

test('失败重试生成新渠道尝试号并持久化处理中渠道单号', async () => {
  const order = makeReviewingOrder(OrderPaymentMethod.Alipay);
  order.refund.status = OrderRefundStatus.Failed;
  order.refund.channelRefundNo = 'CHANNEL-OLD-1';
  order.refund.attempt = 1;
  order.refund.reviewerId = 'reviewer-original';
  order.refund.reviewedAt = new Date('2026-07-22T00:02:00.000Z');
  let submittedChannelRefundNo = '';
  const transactions = {
    begin: async (input: { channelRefundNo: string }) => {
      assert.notEqual(input.channelRefundNo, order.refund.refundNo);
      assert.notEqual(input.channelRefundNo, 'CHANNEL-OLD-1');
      order.refund.status = OrderRefundStatus.Processing;
      order.refund.channelRefundNo = input.channelRefundNo;
      order.refund.attempt = 2;
      order.refund.providerRefundNo = '';
      return { outcome: 'retry_started' as const, order, refund: order.refund };
    },
    recordChannelResult: async (input: { channelRefundNo: string; providerRefundNo: string }) => {
      assert.equal(input.channelRefundNo, submittedChannelRefundNo);
      order.refund.providerRefundNo = input.providerRefundNo;
      return { outcome: 'recorded' as const, order, refund: order.refund };
    },
  } as unknown as OrderRefundTransaction;
  const port = refundPort({
    status: RefundExecutionStatus.Processing,
    providerRefundNo: 'ALIPAY-PROVIDER-2',
    failReason: '',
  });
  port.createRefund = async (input) => {
    submittedChannelRefundNo = input.outRefundNo;
    return {
      status: RefundExecutionStatus.Processing,
      providerRefundNo: 'ALIPAY-PROVIDER-2',
      failReason: '',
    };
  };

  const result = await approveUseCase(order, transactions, resolverFor(port)).execute(
    'reviewer-retry',
    order.id,
  );

  assert.equal(order.refund.attempt, 2);
  assert.equal(order.refund.providerRefundNo, 'ALIPAY-PROVIDER-2');
  assert.equal(order.refund.reviewerId, 'reviewer-original');
  assert.equal(order.refund.reviewedAt?.toISOString(), '2026-07-22T00:02:00.000Z');
});

test('处理中退款只查询当前渠道尝试号', async () => {
  const order = makeReviewingOrder(OrderPaymentMethod.Wechat);
  order.refund.status = OrderRefundStatus.Processing;
  order.refund.channelRefundNo = 'CHANNEL-CURRENT-1';
  order.refund.attempt = 1;
  let queriedChannelRefundNo = '';
  const transactions = {
    begin: async () => ({ outcome: 'already_processing' as const, order, refund: order.refund }),
    recordChannelResult: async () => ({
      outcome: 'recorded' as const,
      order,
      refund: order.refund,
    }),
  } as unknown as OrderRefundTransaction;
  const port = refundPort(
    {
      status: RefundExecutionStatus.Processing,
      providerRefundNo: 'WECHAT-PROVIDER-1',
      failReason: '',
    },
    undefined,
    undefined,
    PaymentProvider.Wechat,
  );
  port.queryRefund = async (input) => {
    queriedChannelRefundNo = input.outRefundNo;
    return {
      status: RefundExecutionStatus.Processing,
      providerRefundNo: 'WECHAT-PROVIDER-1',
      failReason: '',
    };
  };

  await approveUseCase(order, transactions, resolverFor(port)).execute('reviewer-1', order.id);

  assert.equal(queriedChannelRefundNo, 'CHANNEL-CURRENT-1');
});

test('处理中查询暂未找到时使用当前渠道尝试号幂等重发且不开放新尝试', async () => {
  const order = makeReviewingOrder(OrderPaymentMethod.Wechat);
  order.refund.status = OrderRefundStatus.Processing;
  order.refund.channelRefundNo = 'CHANNEL-CURRENT-1';
  order.refund.attempt = 1;
  let submittedChannelRefundNo = '';
  let failed = false;
  const transactions = {
    begin: async () => ({ outcome: 'already_processing' as const, order, refund: order.refund }),
    recordChannelResult: async () => ({
      outcome: 'recorded' as const,
      order,
      refund: order.refund,
    }),
    fail: async () => {
      failed = true;
      return { order, refund: order.refund };
    },
  } as unknown as OrderRefundTransaction;
  const port = refundPort(
    {
      status: RefundExecutionStatus.NotFound,
      providerRefundNo: '',
      failReason: '',
    },
    undefined,
    undefined,
    PaymentProvider.Wechat,
  );
  port.createRefund = async (input) => {
    submittedChannelRefundNo = input.outRefundNo;
    return {
      status: RefundExecutionStatus.Processing,
      providerRefundNo: 'WECHAT-PROVIDER-1',
      failReason: '',
    };
  };

  const result = await approveUseCase(order, transactions, resolverFor(port)).execute(
    'reviewer-2',
    order.id,
  );

  assert.equal(submittedChannelRefundNo, 'CHANNEL-CURRENT-1');
  assert.equal(order.refund.attempt, 1);
  assert.equal(result.refund?.status, OrderRefundStatus.Processing);
  assert.equal(failed, false);
});

test('审批前配置错误不创建尝试，请求后未知或不可信响应保持当前尝试处理中', async () => {
  const unknownOrder = makeReviewingOrder(OrderPaymentMethod.Wechat);
  const unknown = await approveUseCase(
    unknownOrder,
    transactionHarness(unknownOrder),
    resolverFor(
      refundPort(
        undefined,
        new RefundOutcomeUnknownError('渠道结果未知'),
        undefined,
        PaymentProvider.Wechat,
      ),
    ),
  ).execute('reviewer-1', unknownOrder.id);
  assert.equal(unknown.refund?.status, OrderRefundStatus.Processing);

  const configOrder = makeReviewingOrder(OrderPaymentMethod.Wechat);
  await assert.rejects(
    approveUseCase(
      configOrder,
      transactionHarness(configOrder),
      resolverFor(
        refundPort(
          undefined,
          undefined,
          new ServiceUnavailableException('微信平台证书未配置'),
          PaymentProvider.Wechat,
        ),
      ),
    ).execute('reviewer-1', configOrder.id),
    /微信平台证书未配置/,
  );
  assert.equal(configOrder.refund.status, OrderRefundStatus.PendingReview);
  assert.equal(configOrder.refund.attempt, 0);

  const untrustedOrder = makeReviewingOrder(OrderPaymentMethod.Wechat);
  await assert.rejects(
    approveUseCase(
      untrustedOrder,
      transactionHarness(untrustedOrder),
      resolverFor(
        refundPort(
          undefined,
          new BadGatewayException('微信退款响应验签失败'),
          undefined,
          PaymentProvider.Wechat,
        ),
      ),
    ).execute('reviewer-1', untrustedOrder.id),
    /微信退款响应验签失败/,
  );
  assert.equal(untrustedOrder.refund.status, OrderRefundStatus.Processing);
  assert.equal(untrustedOrder.refund.attempt, 1);
});

test('驳回退款恢复申请前状态并保留审核原因', async () => {
  const order = makeReviewingOrder(OrderPaymentMethod.Balance);
  order.refund.sourceOrderStatus = OrderStatus.Dispatching;
  const transactions = transactionHarness(order);
  const useCase = new RejectOrderRefundUseCase(
    repositoryFor(order),
    transactions,
    scopeAllowing(),
    { syncTitle: async () => undefined } as unknown as OrderGroupService,
  );

  const result = await useCase.execute('reviewer-1', order.id, '申请理由不符合规则');

  assert.equal(result.status, OrderStatus.Dispatching);
  assert.equal(result.refund?.status, OrderRefundStatus.Rejected);
  assert.equal(result.refund?.rejectReason, '申请理由不符合规则');
});
