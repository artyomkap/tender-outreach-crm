import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddEmailDateColumn1708000000033 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'email_messages',
      new TableColumn({
        name: 'email_date',
        type: 'timestamp',
        isNullable: true,
        default: null,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('email_messages', 'email_date');
  }
}
