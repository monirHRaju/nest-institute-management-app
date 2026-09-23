import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { TenantsModule } from './tenants/tenants.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    // ── Global env config ──────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Rate limiting ──────────────────────────────────────────────────────
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // ── Database (global) ─────────────────────────────────────────────────
    PrismaModule,

    // ── Feature modules ───────────────────────────────────────────────────
    AuthModule,
    TenantsModule,
    // PublicModule  ← Segment 1.5
    // CoursesModule ← Phase 2
    // StudentsModule ← Phase 2
    // FeesModule ← Phase 3
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // ── Global guards (order matters: JWT first, then Roles) ───────────────
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,  // validates Bearer token on all non-@Public() routes
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,    // checks @Roles() metadata, runs after JWT validation
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.GET },
        // Auth routes excluded so SUPER_ADMIN can login without tenant header
        { path: 'auth/(.*)', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
