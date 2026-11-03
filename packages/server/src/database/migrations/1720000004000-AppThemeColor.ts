import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AppThemeColor1720000004000 implements MigrationInterface {
  name = 'AppThemeColor1720000004000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `hub_apps` ADD COLUMN `themeColor` varchar(7) NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `hub_apps` DROP COLUMN `themeColor`');
  }
}
