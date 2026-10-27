#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('node:fs/promises');
const path = require('node:path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const outputArg = process.argv.find((value) => value.startsWith('--output='));
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputPath = path.resolve(
  outputArg?.slice('--output='.length)
    ?? path.join(__dirname, '..', '..', 'backups', 'production', `newoteg-catalog-rebuild-${stamp}.json`),
);

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL est absent.');

const databaseUrl = new URL(process.env.DATABASE_URL);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 20_000,
  idleTimeoutMillis: 20_000,
  keepAlive: true,
  ssl: ['localhost', '127.0.0.1'].includes(databaseUrl.hostname)
    ? undefined
    : { rejectUnauthorized: false },
});

const quoteIdentifier = (value) => `"${String(value).replace(/"/g, '""')}"`;

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const tableResult = await client.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
    );
    const tables = {};
    const counts = {};
    for (const { table_name: tableName } of tableResult.rows) {
      const result = await client.query(`SELECT * FROM ${quoteIdentifier(tableName)}`);
      tables[tableName] = result.rows;
      counts[tableName] = result.rowCount;
    }
    await client.query('COMMIT');

    const payload = {
      createdAt: new Date().toISOString(),
      purpose: 'Sauvegarde avant reconstruction du catalogue depuis inventaire photographié',
      database: { host: databaseUrl.hostname, name: databaseUrl.pathname.replace(/^\//, '') },
      counts,
      tables,
    };
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const temporaryPath = `${outputPath}.tmp`;
    await fs.writeFile(temporaryPath, JSON.stringify(payload, null, 2), 'utf8');
    await fs.rename(temporaryPath, outputPath);
    console.log(JSON.stringify({ output: outputPath, tables: tableResult.rowCount, counts }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

