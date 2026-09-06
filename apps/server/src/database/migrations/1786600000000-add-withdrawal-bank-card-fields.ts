import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 计全付提现改为转账到银行卡：提现单增加开户行名称与银行预留手机号
 * （易宝对私银行卡转账要求身份证号 + 手机号）。历史支付宝 / 微信零钱单据保持为空。
 */
export class AddWithdrawalBankCardFields1786600000000 implements MigrationInterface {
  name = 'AddWithdrawalBankCardFields1786600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wallet_withdrawal_order"
        ADD COLUMN "bankName" character varying(64),
        ADD COLUMN "phone" character varying(20)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wallet_withdrawal_order"
        DROP COLUMN "phone",
        DROP COLUMN "bankName"
    `);
  }
}
