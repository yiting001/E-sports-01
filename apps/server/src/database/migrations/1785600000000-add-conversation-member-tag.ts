import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 会话成员增加业务身份标签（老板/客服/打手/管理员），历史成员默认空串不展示。 */
export class AddConversationMemberTag1785600000000 implements MigrationInterface {
  name = 'AddConversationMemberTag1785600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sys_conversation_member"
        ADD COLUMN "tag" character varying(16) NOT NULL DEFAULT ''
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sys_conversation_member" DROP COLUMN "tag"`);
  }
}
