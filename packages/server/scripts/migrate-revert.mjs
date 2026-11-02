import 'dotenv/config';
import { AppDataSource } from '../dist/database/data-source.js';

const dataSource = AppDataSource;

try {
  await dataSource.initialize();
  await dataSource.undoLastMigration({ transaction: 'all' });
  console.log('已回滚最后一个迁移');
} catch (error) {
  console.error('回滚失败：', error);
  process.exitCode = 1;
} finally {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
}
