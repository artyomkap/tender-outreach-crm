import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSshServers1708000000001 implements MigrationInterface {
  name = 'AddSshServers1708000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ssh_servers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "host" character varying NOT NULL,
        "port" integer NOT NULL DEFAULT 22,
        "username" character varying NOT NULL,
        "encrypted_password" text,
        "encrypted_private_key" text,
        "auth_type" character varying NOT NULL DEFAULT 'password',
        "user_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ssh_servers_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ssh_servers_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ssh_servers"`);
  }
}
