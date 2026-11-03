import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 应用外链字段；已由 synchronize 建过的列直接跳过。 */
export class AppLinks1720000003000 implements MigrationInterface {
  name = 'AppLinks1720000003000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const columns = ['docsUrl', 'releaseUrl'];
    for (const name of columns) {
      if (await queryRunner.hasColumn('hub_apps', name)) continue;
      await queryRunner.query(
        `ALTER TABLE \`hub_apps\` ADD COLUMN \`${name}\` varchar(255) NULL`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const name of ['releaseUrl', 'docsUrl']) {
      if (!(await queryRunner.hasColumn('hub_apps', name))) continue;
      await queryRunner.query(
        `ALTER TABLE \`hub_apps\` DROP COLUMN \`${name}\``,
      );
    }
  }
}
