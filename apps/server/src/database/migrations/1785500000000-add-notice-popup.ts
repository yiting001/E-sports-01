import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 增加弹窗公告标记，历史通知默认不弹窗，仅新标记的公告在 C 端首次进入弹出。 */
export class AddNoticePopup1785500000000 implements MigrationInterface {
  name = 'AddNoticePopup1785500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notice"
        ADD COLUMN "popup" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notice_popup" ON "notice" ("popup")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_notice_popup"`);
    await queryRunner.query(`ALTER TABLE "notice" DROP COLUMN "popup"`);
  }
}
