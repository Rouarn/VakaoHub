import 'dotenv/config';
import { AppDataSource } from '../dist/database/data-source.js';

const dataSource = AppDataSource;

try {
  await dataSource.initialize();
  const executed = await dataSource.runMigrations({ transaction: 'all' });
  if (executed.length === 0) {
    console.log('没有待执行的迁移');
  } else {
    console.log('已执行迁移：', executed.map((migration) => migration.name).join(', '));
  }
} catch (error) {
  console.error('迁移失败：', error);
  process.exitCode = 1;
} finally {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
}
