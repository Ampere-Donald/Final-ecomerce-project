import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  constructor() {
    // DB distante (Railway proxy) : on durcit le pool pour éviter qu'une requête
    // reste bloquée indéfiniment quand une connexion lâche côté réseau.
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 15,                        // marge sous la limite Postgres (100)
      connectionTimeoutMillis: 10000, // échec rapide plutôt qu'attente infinie
      idleTimeoutMillis: 30000,       // garde les connexions chaudes plus longtemps
      keepAlive: true,                // évite que le proxy coupe les sockets inactives
    });
    const adapter = new PrismaPg(pool);
    super({
      adapter,
      log: ['error', 'warn'],
      transactionOptions: {
        maxWait: 10_000,  // attendre un slot de connexion jusqu'à 10 s
        timeout: 30_000,  // durée max de la transaction : 30 s
      },
    });
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
