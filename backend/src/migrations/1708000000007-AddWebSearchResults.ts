import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebSearchResults1708000000007 implements MigrationInterface {
  name = 'AddWebSearchResults1708000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "web_search_results" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ai_search_term_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "query" text NOT NULL,
        "url" text NOT NULL,
        "title" text NOT NULL DEFAULT '',
        "snippet" text NOT NULL DEFAULT '',
        "favicon" text NOT NULL DEFAULT '',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_web_search_results_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_wsr_search_term_id" FOREIGN KEY ("ai_search_term_id")
          REFERENCES "ai_search_terms"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_wsr_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_wsr_search_term_id" ON "web_search_results" ("ai_search_term_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_wsr_user_id" ON "web_search_results" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "web_search_results"`);
  }
}
