import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOutreachTables1708000000020 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "outreach_email_accounts" (
        "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        "user_id" uuid NOT NULL,
        "email" varchar NOT NULL,
        "sender_name" varchar,
        "smtp_host" varchar NOT NULL,
        "smtp_port" int DEFAULT 587,
        "smtp_user" varchar NOT NULL,
        "smtp_pass" varchar NOT NULL,
        "imap_host" varchar,
        "imap_port" int,
        "imap_user" varchar,
        "imap_pass" varchar,
        "daily_limit" int DEFAULT 50,
        "sent_today" int DEFAULT 0,
        "sent_today_date" date,
        "is_warmup_enabled" boolean DEFAULT false,
        "status" varchar(20) DEFAULT 'active',
        "last_error" text,
        "signature" text,
        "smtp_relay_url" varchar,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "outreach_lead_lists" (
        "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        "user_id" uuid NOT NULL,
        "name" varchar NOT NULL,
        "description" text,
        "leads_count" int DEFAULT 0,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "outreach_leads" (
        "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        "user_id" uuid NOT NULL,
        "lead_list_id" uuid NOT NULL REFERENCES "outreach_lead_lists"("id") ON DELETE CASCADE,
        "email" varchar NOT NULL,
        "first_name" varchar,
        "last_name" varchar,
        "company" varchar,
        "website" varchar,
        "position" varchar,
        "phone" varchar,
        "custom_fields" jsonb,
        "status" varchar(20) DEFAULT 'active',
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "outreach_campaigns" (
        "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        "user_id" uuid NOT NULL,
        "name" varchar NOT NULL,
        "status" varchar(20) DEFAULT 'draft',
        "lead_list_id" uuid,
        "email_account_ids" jsonb DEFAULT '[]',
        "daily_send_limit" int DEFAULT 50,
        "send_from_hour" int DEFAULT 9,
        "send_to_hour" int DEFAULT 18,
        "timezone" varchar DEFAULT 'Europe/Moscow',
        "track_opens" boolean DEFAULT false,
        "stats_sent" int DEFAULT 0,
        "stats_opened" int DEFAULT 0,
        "stats_replied" int DEFAULT 0,
        "stats_bounced" int DEFAULT 0,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "outreach_campaign_steps" (
        "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        "campaign_id" uuid NOT NULL REFERENCES "outreach_campaigns"("id") ON DELETE CASCADE,
        "step_number" int NOT NULL,
        "subject" varchar,
        "body" text NOT NULL,
        "delay_days" int DEFAULT 1,
        "delay_hours" int DEFAULT 0,
        "created_at" timestamp DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "outreach_campaign_leads" (
        "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        "campaign_id" uuid NOT NULL REFERENCES "outreach_campaigns"("id") ON DELETE CASCADE,
        "lead_id" uuid NOT NULL REFERENCES "outreach_leads"("id") ON DELETE CASCADE,
        "current_step" int DEFAULT 0,
        "status" varchar(20) DEFAULT 'pending',
        "next_send_at" timestamp,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "outreach_campaign_emails" (
        "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        "campaign_id" uuid NOT NULL REFERENCES "outreach_campaigns"("id") ON DELETE CASCADE,
        "campaign_step_id" uuid NOT NULL REFERENCES "outreach_campaign_steps"("id") ON DELETE CASCADE,
        "campaign_lead_id" uuid NOT NULL,
        "lead_id" uuid NOT NULL,
        "email_account_id" uuid NOT NULL,
        "to_email" varchar NOT NULL,
        "subject" varchar,
        "body" text NOT NULL,
        "status" varchar(20) DEFAULT 'scheduled',
        "scheduled_at" timestamp,
        "sent_at" timestamp,
        "opened_at" timestamp,
        "replied_at" timestamp,
        "error_message" text,
        "reply_text" text,
        "created_at" timestamp DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_outreach_email_accounts_user" ON "outreach_email_accounts"("user_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_outreach_leads_list" ON "outreach_leads"("lead_list_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_outreach_leads_email" ON "outreach_leads"("email")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_outreach_campaign_leads_campaign" ON "outreach_campaign_leads"("campaign_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_outreach_campaign_leads_next_send" ON "outreach_campaign_leads"("next_send_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_outreach_campaign_emails_campaign" ON "outreach_campaign_emails"("campaign_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_outreach_campaign_emails_status" ON "outreach_campaign_emails"("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "outreach_campaign_emails" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "outreach_campaign_leads" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "outreach_campaign_steps" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "outreach_campaigns" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "outreach_leads" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "outreach_lead_lists" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "outreach_email_accounts" CASCADE`);
  }
}
