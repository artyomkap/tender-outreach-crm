import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSearchQueriesAndFavorites1708000000004
  implements MigrationInterface
{
  name = 'AddSearchQueriesAndFavorites1708000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Search queries log — each search the user performs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "search_queries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "query_params" jsonb NOT NULL,
        "results_count" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_search_queries_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_search_queries_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_search_queries_user_id" ON "search_queries" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_search_queries_created_at" ON "search_queries" ("created_at")
    `);

    // Found purchases — purchases discovered per search query
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "found_purchases" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "purchase_id" uuid NOT NULL,
        "search_query_id" uuid,
        "is_favorite" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_found_purchases_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_found_purchases_user_purchase" UNIQUE ("user_id", "purchase_id"),
        CONSTRAINT "FK_found_purchases_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_found_purchases_purchase_id" FOREIGN KEY ("purchase_id")
          REFERENCES "purchases"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_found_purchases_search_query_id" FOREIGN KEY ("search_query_id")
          REFERENCES "search_queries"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_found_purchases_user_id" ON "found_purchases" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_found_purchases_is_favorite" ON "found_purchases" ("user_id", "is_favorite")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "found_purchases"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "search_queries"`);
  }
}
