import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 应用主题色；已由 synchronize 建过的列直接跳过。 */
export class AppThemeColor1720000004000 implements MigrationInterface {
  name = 'AppThemeColor1720000004000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('hub_apps', 'themeColor')) return;
    await queryRunner.query(
      'ALTER TABLE `hub_apps` ADD COLUMN `themeColor` varchar(7) NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('hub_apps', 'themeColor'))) return;
    await queryRunner.query('ALTER TABLE `hub_apps` DROP COLUMN `themeColor`');
  }
}
