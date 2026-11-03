import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { env } from '../../config/env.js';
import { ClientEventEntity } from '../../database/entities/client-event.entity.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 客户端事件保留策略。
 *
 * 默认 EVENT_RETENTION_DAYS=0：不启用清理，历史事件永久保留。
 * 显式配置天数后，启动时执行一次、此后每 24 小时清理一次超期事件。
 */
@Injectable()
export class EventRetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('EventRetention');
  private timer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(ClientEventEntity)
    private readonly events: Repository<ClientEventEntity>,
  ) {}

  onModuleInit(): void {
    if (env.events.retentionDays <= 0) return;
    void this.purge();
    this.timer = setInterval(() => void this.purge(), DAY_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async purge(): Promise<number> {
    const cutoff = Date.now() - env.events.retentionDays * DAY_MS;
    const result = await this.events.delete({ createdAt: LessThan(cutoff) });
    const removed = result.affected ?? 0;
    if (removed > 0) {
      this.logger.log(
        `已清理 ${removed} 条超过 ${env.events.retentionDays} 天的客户端事件`,
      );
    }
    return removed;
  }
}
