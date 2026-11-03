import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 初始结构。
 *
 * 迁移策略：本迁移与后续迁移都必须可重复执行。
 * - 全新库：CREATE TABLE IF NOT EXISTS 建基础表，后续迁移按需补列。
 * - synchronize 建过的开发库：建表语句为空操作，后续迁移检测列已存在后跳过，
 *   从而把迁移表状态补齐，之后不再因 Duplicate column 失败。
 */
export class Init1720000000000 implements MigrationInterface {
  name = 'Init1720000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`hub_admin_users\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`username\` varchar(64) NOT NULL,
        \`passwordHash\` varchar(100) NOT NULL,
        \`displayName\` varchar(64) NULL,
        \`createdAt\` bigint NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_hub_admin_users_username\` (\`username\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`hub_apps\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`appKey\` varchar(64) NOT NULL,
        \`name\` varchar(128) NOT NULL,
        \`description\` varchar(512) NULL,
        \`iconUrl\` varchar(512) NULL,
        \`category\` varchar(32) NULL,
        \`repoUrl\` varchar(255) NULL,
        \`homepage\` varchar(255) NULL,
        \`createdAt\` bigint NOT NULL,
        \`updatedAt\` bigint NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_hub_apps_appKey\` (\`appKey\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`hub_releases\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`appId\` int NOT NULL,
        \`versionName\` varchar(32) NOT NULL,
        \`versionCode\` int NOT NULL,
        \`channel\` varchar(16) NOT NULL DEFAULT 'stable',
        \`status\` int NOT NULL DEFAULT 0,
        \`grayPercent\` int NOT NULL DEFAULT 0,
        \`graySchedule\` text NULL,
        \`forceUpdate\` int NOT NULL DEFAULT 0,
        \`minVersionCode\` int NOT NULL DEFAULT 0,
        \`updateLog\` text NULL,
        \`publishedAt\` bigint NULL,
        \`offlineReason\` varchar(8) NULL,
        \`createdAt\` bigint NOT NULL,
        \`updatedAt\` bigint NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_hub_releases_app_version_channel\` (\`appId\`, \`versionCode\`, \`channel\`),
        KEY \`IDX_hub_releases_app_status\` (\`appId\`, \`status\`),
        CONSTRAINT \`FK_hub_releases_app\` FOREIGN KEY (\`appId\`) REFERENCES \`hub_apps\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`hub_artifacts\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`releaseId\` int NOT NULL,
        \`platform\` varchar(16) NOT NULL,
        \`arch\` varchar(16) NOT NULL DEFAULT 'universal',
        \`format\` varchar(16) NOT NULL,
        \`fileName\` varchar(255) NOT NULL,
        \`relPath\` varchar(512) NOT NULL,
        \`size\` bigint NOT NULL,
        \`sha256\` varchar(64) NOT NULL,
        \`minOs\` varchar(16) NULL,
        \`signature\` varchar(255) NULL,
        \`notarized\` int NOT NULL DEFAULT 0,
        \`downloadCount\` int NOT NULL DEFAULT 0,
        \`createdAt\` bigint NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_hub_artifacts_release_platform_arch_format\` (\`releaseId\`, \`platform\`, \`arch\`, \`format\`),
        CONSTRAINT \`FK_hub_artifacts_release\` FOREIGN KEY (\`releaseId\`) REFERENCES \`hub_releases\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`hub_events\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`appId\` int NOT NULL,
        \`releaseId\` int NULL,
        \`artifactId\` int NULL,
        \`deviceId\` varchar(128) NULL,
        \`platform\` varchar(16) NOT NULL,
        \`arch\` varchar(16) NULL,
        \`type\` varchar(32) NOT NULL,
        \`fromVersionCode\` int NULL,
        \`toVersionCode\` int NULL,
        \`createdAt\` bigint NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`IDX_hub_events_app_created\` (\`appId\`, \`createdAt\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `hub_events`');
    await queryRunner.query('DROP TABLE IF EXISTS `hub_artifacts`');
    await queryRunner.query('DROP TABLE IF EXISTS `hub_releases`');
    await queryRunner.query('DROP TABLE IF EXISTS `hub_apps`');
    await queryRunner.query('DROP TABLE IF EXISTS `hub_admin_users`');
  }
}
