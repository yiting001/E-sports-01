import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 提现订单增加收款方身份证号（报税用）；历史单据保持为空。 */
export class AddWithdrawalIdCard1785700000000 implements MigrationInterface {
  name = 'AddWithdrawalIdCard1785700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wallet_withdrawal_order"
        ADD COLUMN "idCardNo" character varying(18)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wallet_withdrawal_order" DROP COLUMN "idCardNo"`,
    );
  }
}
