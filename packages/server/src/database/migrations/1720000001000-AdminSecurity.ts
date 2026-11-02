import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 管理端安全字段：令牌版本、登录失败计数、锁定截止时间 */
export class AdminSecurity1720000001000 implements MigrationInterface {
  name = 'AdminSecurity1720000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `hub_admin_users` ADD COLUMN `tokenVersion` int NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'ALTER TABLE `hub_admin_users` ADD COLUMN `failedLoginAttempts` int NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'ALTER TABLE `hub_admin_users` ADD COLUMN `lockedUntil` bigint NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `hub_admin_users` DROP COLUMN `lockedUntil`',
    );
    await queryRunner.query(
      'ALTER TABLE `hub_admin_users` DROP COLUMN `failedLoginAttempts`',
    );
    await queryRunner.query(
      'ALTER TABLE `hub_admin_users` DROP COLUMN `tokenVersion`',
    );
  }
}
