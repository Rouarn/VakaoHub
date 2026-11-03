import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 管理端安全字段：令牌版本、登录失败计数、锁定截止时间。
 *
 * 迁移必须可重复执行：开发库可能已由 synchronize 建过这些列，
 * 因此先查列是否存在再补齐，保证 synchronize / migrate 两条路径都能收敛到同一结构。
 */
export class AdminSecurity1720000001000 implements MigrationInterface {
  name = 'AdminSecurity1720000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const columns: Array<[string, string]> = [
      ['tokenVersion', 'int NOT NULL DEFAULT 0'],
      ['failedLoginAttempts', 'int NOT NULL DEFAULT 0'],
      ['lockedUntil', 'bigint NULL'],
    ];
    for (const [name, definition] of columns) {
      if (await queryRunner.hasColumn('hub_admin_users', name)) continue;
      await queryRunner.query(
        `ALTER TABLE \`hub_admin_users\` ADD COLUMN \`${name}\` ${definition}`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const columns = ['lockedUntil', 'failedLoginAttempts', 'tokenVersion'];
    for (const name of columns) {
      if (!(await queryRunner.hasColumn('hub_admin_users', name))) continue;
      await queryRunner.query(
        `ALTER TABLE \`hub_admin_users\` DROP COLUMN \`${name}\``,
      );
    }
  }
}
