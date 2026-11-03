import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AppLinks1720000003000 implements MigrationInterface {
  name = 'AppLinks1720000003000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `hub_apps` ADD COLUMN `docsUrl` varchar(255) NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `hub_apps` ADD COLUMN `releaseUrl` varchar(255) NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `hub_apps` DROP COLUMN `releaseUrl`');
    await queryRunner.query('ALTER TABLE `hub_apps` DROP COLUMN `docsUrl`');
  }
}
