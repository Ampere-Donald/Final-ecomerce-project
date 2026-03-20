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

  // --- CORS dynamique pour Railway + Vercel (multi-origines ou wildcards) ---
  const rawOrigins = process.env.FRONTEND_URLS || '';
  const envOrigins = rawOrigins.split(',').map((u) => u.trim()).filter(Boolean);

  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3001',
      /\\.vercel\\.app$/,
      /\\.up\\.railway\\.app$/,
      ...envOrigins,
    ],
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
