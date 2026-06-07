import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import 'dotenv/config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  if (process.env.RUN_PRISMA_MIGRATIONS === 'true') {
    try {
      const { execSync } = require('child_process');
      logger.log('Running Prisma migrations...');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      logger.log('Prisma migrations applied successfully.');
    } catch (error) {
      logger.error('Failed to run Prisma migrations:', error);
    }
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ── Security headers ───────────────────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  // ── Cookie parser (for future httpOnly cookie auth) ────────────────────
  app.use(cookieParser());

  // ── Global pipes & filters ─────────────────────────────────────────────
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new AuditLogInterceptor());

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // --- CORS ---
  const rawOrigins = process.env.FRONTEND_URLS || '';
  const envOrigins = rawOrigins.split(',').map((u) => u.trim()).filter(Boolean);

  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3001',
      'https://newoteg.com',
      'https://www.newoteg.com',
      'https://admin.newoteg.com',
      ...envOrigins,
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Backend NEWOTEG started on port ${port}`);
}
bootstrap();
