import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@repo/db';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? [
              { level: 'query', emit: 'event' },
              { level: 'error', emit: 'stdout' },
              { level: 'warn', emit: 'stdout' },
            ]
          : [{ level: 'error', emit: 'stdout' }],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Connected to Supabase PostgreSQL');

    // Log queries in development (helpful for debugging N+1 issues)
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any).$on('query', (e: { query: string; duration: number }) => {
        this.logger.debug(`Query (${e.duration}ms): ${e.query}`);
      });
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }

  /**
   * Graceful shutdown helper — call in main.ts if needed.
   * NestJS lifecycle hooks (onModuleDestroy) handle this automatically.
   */
  async enableShutdownHooks() {
    process.on('beforeExit', async () => {
      await this.$disconnect();
    });
  }
}
