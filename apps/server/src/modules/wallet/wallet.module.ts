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

import { TypeormWalletRepository } from './infrastructure/wallet.repository';
import { TypeormTransactionRepository } from './infrastructure/transaction.repository';
import { TypeormRechargeRepository } from './infrastructure/recharge.repository';
import { TypeormWithdrawalRepository } from './infrastructure/withdrawal.repository';
import { TypeormWalletLedger } from './infrastructure/wallet.ledger';
import { AlipayClientFactory } from './infrastructure/drivers/alipay-client.factory';
import { AlipayPaymentDriver } from './infrastructure/drivers/alipay-payment.driver';
import { WechatPayConfigFactory } from './infrastructure/drivers/wechat-pay.config';
import { WechatPaymentDriver } from './infrastructure/drivers/wechat-payment.driver';
import { AlipayPayoutDriver } from './infrastructure/drivers/alipay-payout.driver';
import { WechatPayoutDriver } from './infrastructure/drivers/wechat-payout.driver';

import { PaymentResolver } from './application/payment.resolver';
import { PayoutResolver } from './application/payout.resolver';
import { WalletService } from './application/wallet.service';
import { GetMyWalletUseCase } from './application/use-cases/get-my-wallet.usecase';
import { GetWalletStatsUseCase } from './application/use-cases/get-wallet-stats.usecase';
import { ListTransactionsUseCase } from './application/use-cases/list-transactions.usecase';
import { CreateRechargeUseCase } from './application/use-cases/create-recharge.usecase';
import { HandleRechargeCallbackUseCase } from './application/use-cases/handle-recharge-callback.usecase';
import { CreateWithdrawalUseCase } from './application/use-cases/create-withdrawal.usecase';
import { ListWalletsUseCase } from './application/use-cases/list-wallets.usecase';
import { ListUserTransactionsUseCase } from './application/use-cases/list-user-transactions.usecase';
import { AdjustWalletUseCase } from './application/use-cases/adjust-wallet.usecase';

import { WalletMineController } from './interfaces/controllers/wallet.mine.controller';
import { WalletStatsController } from './interfaces/controllers/wallet.stats.controller';
import { WalletTransactionsController } from './interfaces/controllers/wallet.transactions.controller';
import { RechargeCreateController } from './interfaces/controllers/recharge.create.controller';
import { RechargeCallbackController } from './interfaces/controllers/recharge.callback.controller';
import { WithdrawalCreateController } from './interfaces/controllers/withdrawal.create.controller';
import { WalletAdminListController } from './interfaces/controllers/wallet.admin.list.controller';
import { WalletAdminTransactionsController } from './interfaces/controllers/wallet.admin.transactions.controller';
import { WalletAdminAdjustController } from './interfaces/controllers/wallet.admin.adjust.controller';

/**
 * 钱包模块。
 * DDD 四层装配。个人侧（登录即用，无需特定权限）：我的钱包/统计/明细、充值
 * （支付宝/微信扫码，官方协议）、提现（支付宝转账，微信预留），打开无则自动初始化。
 * 管理侧（RBAC 门控，钱包管理）：分页查看所有用户钱包、查看任意用户明细、人工调整余额。
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
    WithdrawalCreateController,
    WalletAdminListController,
    WalletAdminTransactionsController,
    WalletAdminAdjustController,
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

    AlipayClientFactory,
    AlipayPaymentDriver,
    WechatPayConfigFactory,
    WechatPaymentDriver,
    AlipayPayoutDriver,
    WechatPayoutDriver,
    {
      provide: PAYMENT_PORTS,
      useFactory: (alipay: AlipayPaymentDriver, wechat: WechatPaymentDriver) => [
        alipay,
        wechat,
      ],
      inject: [AlipayPaymentDriver, WechatPaymentDriver],
    },
    {
      provide: PAYOUT_PORTS,
      useFactory: (alipay: AlipayPayoutDriver, wechat: WechatPayoutDriver) => [
        alipay,
        wechat,
      ],
      inject: [AlipayPayoutDriver, WechatPayoutDriver],
    },

    PaymentResolver,
    PayoutResolver,
    WalletService,
    GetMyWalletUseCase,
    GetWalletStatsUseCase,
    ListTransactionsUseCase,
    CreateRechargeUseCase,
    HandleRechargeCallbackUseCase,
    CreateWithdrawalUseCase,
    ListWalletsUseCase,
    ListUserTransactionsUseCase,
    AdjustWalletUseCase,
  ],
})
export class WalletModule {}
