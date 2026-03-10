import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessageIdToCampaignEmails1708000000022 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'outreach_campaign_emails' AND column_name = 'message_id'
    `);
    if (columns.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "outreach_campaign_emails"
        ADD COLUMN "message_id" varchar
      `);
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_outreach_campaign_emails_message_id"
        ON "outreach_campaign_emails"("message_id")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_outreach_campaign_emails_message_id"`);
    await queryRunner.query(`ALTER TABLE "outreach_campaign_emails" DROP COLUMN IF EXISTS "message_id"`);
  }
}
