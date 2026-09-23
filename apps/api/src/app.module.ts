import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { TenantsModule } from './tenants/tenants.module';

@Module({
  imports: [
    // ── Global env config ───────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Rate limiting ───────────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // 1 minute
        limit: 100,  // 100 requests per minute per IP
      },
    ]),

    // ── Database ────────────────────────────────────────────────────────────
    PrismaModule,  // @Global() — PrismaService injectable everywhere

    // ── Feature modules ─────────────────────────────────────────────────────
    TenantsModule,
    // AuthModule       ← Segment 1.3
    // PublicModule     ← Segment 1.5
    // CoursesModule    ← Phase 2
    // StudentsModule   ← Phase 2
    // FeesModule       ← Phase 3
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  /**
   * TenantMiddleware runs on ALL routes EXCEPT:
   *  - /api/v1/health  (public health check)
   *  - /api/v1/auth/*  (login, refresh, logout — no tenant needed for SUPER_ADMIN auth)
   *
   * For tenant-scoped auth (TENANT_ADMIN/STAFF/etc.), the x-tenant-slug header
   * is still required at login — TenantMiddleware resolves it then.
   * The /auth/* exclusion is for SUPER_ADMIN login which has no tenant context.
   */
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.GET },
        { path: 'auth/(.*)', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
