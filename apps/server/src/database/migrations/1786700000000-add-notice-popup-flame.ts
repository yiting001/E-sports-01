import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 弹窗公告火焰特效开关，历史弹窗公告默认开启以保持既有展示。 */
export class AddNoticePopupFlame1786700000000 implements MigrationInterface {
  name = 'AddNoticePopupFlame1786700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notice"
        ADD COLUMN "popupFlame" boolean NOT NULL DEFAULT true
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notice" DROP COLUMN "popupFlame"`);
  }
}
