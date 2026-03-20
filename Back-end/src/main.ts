import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // --- CORS dynamique pour Railway + Vercel (multi-origines) ---
  const rawOrigins = process.env.FRONTEND_URLS || '';
  const allowedOrigins: (string | RegExp)[] = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3001',
    ...rawOrigins
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean),
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  // Bind to 0.0.0.0 so Railway can reach the service
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend NEWOTEG démarré sur le port ${port}`);
}
bootstrap();
