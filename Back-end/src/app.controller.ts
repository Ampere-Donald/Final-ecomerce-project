import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly database: DatabaseService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async getHealth() {
    const checks = {
      api: 'ok',
      database: 'ok',
      storage: 'ok',
    };

    try {
      await this.database.$queryRaw`SELECT 1`;
    } catch {
      checks.database = 'error';
    }

    try {
      await access(join(process.cwd(), 'uploads'), constants.R_OK | constants.W_OK);
    } catch {
      checks.storage = 'error';
    }

    const healthy = Object.values(checks).every((value) => value === 'ok');
    const body = {
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    };
    if (!healthy) throw new ServiceUnavailableException(body);
    return body;
  }
}
