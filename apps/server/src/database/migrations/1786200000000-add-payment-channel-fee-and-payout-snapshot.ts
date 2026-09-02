import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 资金对接计全付：
 * - 订单 / 充值单增加渠道手续费（分，商户承担；历史单据默认 0）；
 * - 提现单增加渠道侧快照（上游转账单号、渠道状态、错误码/描述、渠道手续费、最近同步时间），
 *   供异步回调 / 主动查单收敛状态与财务对账；历史单据保持为空。
 * 钱包表沿用 TypeORM 默认命名（camelCase 列名），订单表沿用既有 snake_case 显式列名。
 */
export class AddPaymentChannelFeeAndPayoutSnapshot1786200000000 implements MigrationInterface {
  name = 'AddPaymentChannelFeeAndPayoutSnapshot1786200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "service_order"
        ADD COLUMN "channel_fee_fen" bigint NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "wallet_recharge_order"
        ADD COLUMN "channelFeeFen" bigint NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "wallet_withdrawal_order"
        ADD COLUMN "channelOrderNo" character varying(64),
        ADD COLUMN "channelState" character varying(16),
        ADD COLUMN "channelErrCode" character varying(64),
        ADD COLUMN "channelErrMsg" character varying(255),
        ADD COLUMN "channelFeeFen" bigint NOT NULL DEFAULT 0,
        ADD COLUMN "channelSyncedAt" TIMESTAMP WITH TIME ZONE
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wallet_withdrawal_order"
        DROP COLUMN "channelSyncedAt",
        DROP COLUMN "channelFeeFen",
        DROP COLUMN "channelErrMsg",
        DROP COLUMN "channelErrCode",
        DROP COLUMN "channelState",
        DROP COLUMN "channelOrderNo"
    `);
    await queryRunner.query(`ALTER TABLE "wallet_recharge_order" DROP COLUMN "channelFeeFen"`);
    await queryRunner.query(`ALTER TABLE "service_order" DROP COLUMN "channel_fee_fen"`);
  }
}
