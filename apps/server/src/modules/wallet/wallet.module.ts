import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../config/config.module';
import { RbacModule } from '../rbac/rbac.module';

import { WalletEntity } from './domain/wallet.entity';
import { WalletTransactionEntity } from './domain/wallet-transaction.entity';
import { RechargeOrderEntity } from './domain/recharge-order.entity';
import { WithdrawalOrderEntity } from './domain/withdrawal-order.entity';

import { WALLET_REPOSITORY } from './domain/wallet-repository.interface';
import { WALLET_TRANSACTION_REPOSITORY } from './domain/transaction-repository.interface';
import { RECHARGE_ORDER_REPOSITORY } from './domain/recharge-repository.interface';
import { WITHDRAWAL_ORDER_REPOSITORY } from './domain/withdrawal-repository.interface';
import { WALLET_LEDGER } from './domain/ledger.interface';
import { PAYMENT_PORTS } from './domain/payment-port.interface';
import { PAYOUT_PORTS } from './domain/payout-port.interface';
import { REFUND_PORTS } from './domain/refund-port.interface';

import { TypeormWalletRepository } from './infrastructure/wallet.repository';
import { TypeormTransactionRepository } from './infrastructure/transaction.repository';
import { TypeormRechargeRepository } from './infrastructure/recharge.repository';
import { TypeormWithdrawalRepository } from './infrastructure/withdrawal.repository';
import { TypeormWalletLedger } from './infrastructure/wallet.ledger';
import {
  TypeormWalletTransactionParticipant,
  WALLET_TRANSACTION_PARTICIPANT,
} from './infrastructure/wallet-transaction.participant';
import { AlipayClientFactory } from './infrastructure/drivers/alipay-client.factory';
import { AlipayPaymentDriver } from './infrastructure/drivers/alipay-payment.driver';
import { WechatPayConfigFactory } from './infrastructure/drivers/wechat-pay.config';
import { WechatPaymentDriver } from './infrastructure/drivers/wechat-payment.driver';
import { WechatJsapiPaymentDriver } from './infrastructure/drivers/wechat-jsapi-payment.driver';
import { AlipayPayoutDriver } from './infrastructure/drivers/alipay-payout.driver';
import { WechatPayoutDriver } from './infrastructure/drivers/wechat-payout.driver';
import { AlipayRefundDriver } from './infrastructure/drivers/alipay-refund.driver';
import { WechatRefundDriver } from './infrastructure/drivers/wechat-refund.driver';
import { JqfPayConfigFactory } from './infrastructure/drivers/jqf-pay.config';
import { JqfWechatPaymentDriver } from './infrastructure/drivers/jqf-wechat-payment.driver';
import { JqfWechatJsapiPaymentDriver } from './infrastructure/drivers/jqf-wechat-jsapi-payment.driver';
import { JqfAlipayPaymentDriver } from './infrastructure/drivers/jqf-alipay-payment.driver';
import { JqfAlipayRefundDriver, JqfRefundDriver } from './infrastructure/drivers/jqf-refund.driver';
import {
  JqfAlipayTransferDriver,
  JqfBankCardTransferDriver,
  JqfWechatTransferDriver,
} from './infrastructure/drivers/jqf-transfer.driver';

import { PaymentGatewayService } from './application/payment-gateway.service';
import { PaymentResolver } from './application/payment.resolver';
import { PayoutResolver } from './application/payout.resolver';
import { RefundResolver } from './application/refund.resolver';
import { WalletService } from './application/wallet.service';
import { WechatJsapiPayerService } from './application/wechat-jsapi-payer.service';
import { WalletFinanceReadService } from './application/wallet-finance-read.service';
import { WithdrawalSettlementService } from './application/withdrawal-settlement.service';
import { GetMyWalletUseCase } from './application/use-cases/get-my-wallet.usecase';
import { GetWalletStatsUseCase } from './application/use-cases/get-wallet-stats.usecase';
import { ListTransactionsUseCase } from './application/use-cases/list-transactions.usecase';
import { CreateRechargeUseCase } from './application/use-cases/create-recharge.usecase';
import { HandleRechargeCallbackUseCase } from './application/use-cases/handle-recharge-callback.usecase';
import { QueryRechargeUseCase } from './application/use-cases/query-recharge.usecase';
import { CreateWithdrawalUseCase } from './application/use-cases/create-withdrawal.usecase';
import { ListWalletsUseCase } from './application/use-cases/list-wallets.usecase';
import { ListUserTransactionsUseCase } from './application/use-cases/list-user-transactions.usecase';
import { AdjustWalletUseCase } from './application/use-cases/adjust-wallet.usecase';
import { ListMyWithdrawalsUseCase } from './application/use-cases/list-my-withdrawals.usecase';
import { ListWithdrawalsUseCase } from './application/use-cases/list-withdrawals.usecase';
import { ApproveWithdrawalUseCase } from './application/use-cases/approve-withdrawal.usecase';
import { SyncWithdrawalUseCase } from './application/use-cases/sync-withdrawal.usecase';
import { HandleWithdrawalCallbackUseCase } from './application/use-cases/handle-withdrawal-callback.usecase';
import { RejectWithdrawalUseCase } from './application/use-cases/reject-withdrawal.usecase';
import { ExportWithdrawalTaxUseCase } from './application/use-cases/export-withdrawal-tax.usecase';
import { GetWithdrawTaxConfigUseCase } from './application/use-cases/get-withdraw-tax-config.usecase';
import { SaveWithdrawTaxConfigUseCase } from './application/use-cases/save-withdraw-tax-config.usecase';

import { WalletMineController } from './interfaces/controllers/wallet.mine.controller';
import { WalletStatsController } from './interfaces/controllers/wallet.stats.controller';
import { WalletTransactionsController } from './interfaces/controllers/wallet.transactions.controller';
import { RechargeCreateController } from './interfaces/controllers/recharge.create.controller';
import { RechargeCallbackController } from './interfaces/controllers/recharge.callback.controller';
import { RechargeQueryController } from './interfaces/controllers/recharge.query.controller';
import { WithdrawalCreateController } from './interfaces/controllers/withdrawal.create.controller';
import { WithdrawalMineController } from './interfaces/controllers/withdrawal.mine.controller';
import { WithdrawalCallbackController } from './interfaces/controllers/withdrawal.callback.controller';
import { WalletAdminListController } from './interfaces/controllers/wallet.admin.list.controller';
import { WalletAdminTransactionsController } from './interfaces/controllers/wallet.admin.transactions.controller';
import { WalletAdminAdjustController } from './interfaces/controllers/wallet.admin.adjust.controller';
import { WithdrawalAdminListController } from './interfaces/controllers/withdrawal.admin.list.controller';
import { WithdrawalAdminApproveController } from './interfaces/controllers/withdrawal.admin.approve.controller';
import { WithdrawalAdminSyncController } from './interfaces/controllers/withdrawal.admin.sync.controller';
import { WithdrawalAdminRejectController } from './interfaces/controllers/withdrawal.admin.reject.controller';
import { WithdrawalAdminExportController } from './interfaces/controllers/withdrawal.admin.export.controller';
import { TaxConfigAdminGetController } from './interfaces/controllers/tax-config.admin.get.controller';
import { TaxConfigAdminSaveController } from './interfaces/controllers/tax-config.admin.save.controller';

/**
 * 钱包模块。
 * DDD 四层装配。个人侧（登录即用，无需特定权限）：我的钱包/统计/明细、充值
 * （支付宝/微信扫码、微信公众号 JSAPI；官方协议或计全付聚合网关）、提现申请（审核制；支付宝官方转账或
 * 计全付转账到支付宝/微信零钱，异步结果由转账通知与主动查单收敛），打开无则自动初始化。
 * 管理侧（RBAC 门控）：钱包管理（列表/明细/调整）与财务提现管理（审核通过即发起转账/驳回退款/同步渠道状态）。
 * 充值/提现渠道均为「策略模式 + 配置驱动」，凭证全部入配置中心，无硬编码。
 */
@Module({
  imports: [
    ConfigModule,
    RbacModule,
    TypeOrmModule.forFeature([
      WalletEntity,
      WalletTransactionEntity,
      RechargeOrderEntity,
      WithdrawalOrderEntity,
    ]),
  ],
  controllers: [
    WalletMineController,
    WalletStatsController,
    WalletTransactionsController,
    RechargeCreateController,
    RechargeCallbackController,
    RechargeQueryController,
    WithdrawalCreateController,
    WithdrawalMineController,
    WithdrawalCallbackController,
    WalletAdminListController,
    WalletAdminTransactionsController,
    WalletAdminAdjustController,
    WithdrawalAdminListController,
    WithdrawalAdminApproveController,
    WithdrawalAdminSyncController,
    WithdrawalAdminRejectController,
    WithdrawalAdminExportController,
    TaxConfigAdminGetController,
    TaxConfigAdminSaveController,
  ],
  providers: [
    { provide: WALLET_REPOSITORY, useClass: TypeormWalletRepository },
    {
      provide: WALLET_TRANSACTION_REPOSITORY,
      useClass: TypeormTransactionRepository,
    },
    { provide: RECHARGE_ORDER_REPOSITORY, useClass: TypeormRechargeRepository },
    {
      provide: WITHDRAWAL_ORDER_REPOSITORY,
      useClass: TypeormWithdrawalRepository,
    },
    { provide: WALLET_LEDGER, useClass: TypeormWalletLedger },
    {
      provide: WALLET_TRANSACTION_PARTICIPANT,
      useClass: TypeormWalletTransactionParticipant,
    },

    AlipayClientFactory,
    AlipayPaymentDriver,
    WechatPayConfigFactory,
    WechatPaymentDriver,
    WechatJsapiPaymentDriver,
    AlipayPayoutDriver,
    WechatPayoutDriver,
    AlipayRefundDriver,
    WechatRefundDriver,
    JqfPayConfigFactory,
    JqfWechatPaymentDriver,
    JqfWechatJsapiPaymentDriver,
    JqfAlipayPaymentDriver,
    JqfRefundDriver,
    JqfAlipayRefundDriver,
    JqfAlipayTransferDriver,
    JqfWechatTransferDriver,
    JqfBankCardTransferDriver,
    {
      provide: PAYMENT_PORTS,
      useFactory: (
        alipay: AlipayPaymentDriver,
        wechat: WechatPaymentDriver,
        wechatJsapi: WechatJsapiPaymentDriver,
        jqfWechat: JqfWechatPaymentDriver,
        jqfWechatJsapi: JqfWechatJsapiPaymentDriver,
        jqfAlipay: JqfAlipayPaymentDriver,
      ) => [alipay, wechat, wechatJsapi, jqfWechat, jqfWechatJsapi, jqfAlipay],
      inject: [
        AlipayPaymentDriver,
        WechatPaymentDriver,
        WechatJsapiPaymentDriver,
        JqfWechatPaymentDriver,
        JqfWechatJsapiPaymentDriver,
        JqfAlipayPaymentDriver,
      ],
    },
    {
      provide: PAYOUT_PORTS,
      useFactory: (
        alipay: AlipayPayoutDriver,
        wechat: WechatPayoutDriver,
        jqfAlipay: JqfAlipayTransferDriver,
        jqfWechat: JqfWechatTransferDriver,
        jqfBankCard: JqfBankCardTransferDriver,
      ) => [alipay, wechat, jqfAlipay, jqfWechat, jqfBankCard],
      inject: [
        AlipayPayoutDriver,
        WechatPayoutDriver,
        JqfAlipayTransferDriver,
        JqfWechatTransferDriver,
        JqfBankCardTransferDriver,
      ],
    },
    {
      provide: REFUND_PORTS,
      useFactory: (
        alipay: AlipayRefundDriver,
        wechat: WechatRefundDriver,
        jqf: JqfRefundDriver,
        jqfAlipay: JqfAlipayRefundDriver,
      ) => [alipay, wechat, jqf, jqfAlipay],
      inject: [AlipayRefundDriver, WechatRefundDriver, JqfRefundDriver, JqfAlipayRefundDriver],
    },

    PaymentGatewayService,
    PaymentResolver,
    PayoutResolver,
    RefundResolver,
    WalletService,
    WechatJsapiPayerService,
    WalletFinanceReadService,
    WithdrawalSettlementService,
    GetMyWalletUseCase,
    GetWalletStatsUseCase,
    ListTransactionsUseCase,
    CreateRechargeUseCase,
    HandleRechargeCallbackUseCase,
    QueryRechargeUseCase,
    CreateWithdrawalUseCase,
    ListWalletsUseCase,
    ListUserTransactionsUseCase,
    AdjustWalletUseCase,
    ListMyWithdrawalsUseCase,
    ListWithdrawalsUseCase,
    ApproveWithdrawalUseCase,
    SyncWithdrawalUseCase,
    HandleWithdrawalCallbackUseCase,
    RejectWithdrawalUseCase,
    ExportWithdrawalTaxUseCase,
    GetWithdrawTaxConfigUseCase,
    SaveWithdrawTaxConfigUseCase,
  ],
  // 导出支付/退款渠道解析器，供订单复用同一套支付宝/微信配置与驱动
  exports: [
    PaymentGatewayService,
    PaymentResolver,
    RefundResolver,
    WalletService,
    WechatJsapiPayerService,
    WalletFinanceReadService,
    WALLET_LEDGER,
    WALLET_TRANSACTION_PARTICIPANT,
  ],
})
export class WalletModule {}
