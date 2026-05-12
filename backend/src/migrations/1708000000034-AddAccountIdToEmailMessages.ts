import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddAccountIdToEmailMessages1708000000034 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'email_messages',
      new TableColumn({
        name: 'account_id',
        type: 'uuid',
        isNullable: true,
        default: null,
      }),
    );
    await queryRunner.createForeignKey(
      'email_messages',
      new TableForeignKey({
        columnNames: ['account_id'],
        referencedTableName: 'outreach_email_accounts',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('email_messages');
    const fk = table!.foreignKeys.find((f) => f.columnNames.includes('account_id'));
    if (fk) await queryRunner.dropForeignKey('email_messages', fk);
    await queryRunner.dropColumn('email_messages', 'account_id');
  }
}
