import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 管理端操作审计表 */
export class AuditLog1720000002000 implements MigrationInterface {
  name = 'AuditLog1720000002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`hub_audit_logs\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`username\` varchar(64) NULL,
        \`method\` varchar(8) NOT NULL,
        \`path\` varchar(255) NOT NULL,
        \`statusCode\` int NOT NULL,
        \`ip\` varchar(64) NULL,
        \`createdAt\` bigint NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`IDX_hub_audit_logs_created\` (\`createdAt\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `hub_audit_logs`');
  }
}
