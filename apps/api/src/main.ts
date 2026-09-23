import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyCookie from '@fastify/cookie';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env.NODE_ENV !== 'production' }),
  );

  // ── Cookie plugin (required for refresh_token cookie) ─────────────────────
  await app.register(fastifyCookie as any, {
    secret: process.env.COOKIE_SECRET ?? 'fallback-secret-change-in-prod',
  });

  // ── CORS ──────────────────────────────────────────────────────────────────
  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // ── Global prefix ─────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Swagger (dev only) ────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Institute Management SaaS API')
      .setDescription('Multi-tenant institute management platform')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('refresh_token')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    console.log(`📚 Swagger UI: http://localhost:${process.env.PORT ?? 3001}/api/docs`);
  }

  const port = parseInt(process.env.PORT ?? '3001', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API running on http://localhost:${port}/api/v1`);
}

bootstrap();
