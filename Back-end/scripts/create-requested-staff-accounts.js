#!/usr/bin/env node
/* eslint-disable no-console */

const path = require('node:path');
const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const apply = process.argv.includes('--apply');
const amperePassword = process.env.NEWOTEG_AMPERE_PASSWORD;
const staffTemporaryPin = process.env.NEWOTEG_STAFF_TEMPORARY_PIN;

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL est absent.');
if (apply && !amperePassword) throw new Error('NEWOTEG_AMPERE_PASSWORD est absent.');
if (apply && !/^\d{4,6}$/.test(staffTemporaryPin || '')) {
  throw new Error('NEWOTEG_STAFF_TEMPORARY_PIN doit contenir 4 a 6 chiffres.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 15_000,
  idleTimeoutMillis: 10_000,
  keepAlive: true,
  ssl: { rejectUnauthorized: false },
});

const staffAccounts = [
  { username: 'doris_vendeur', nom: 'Doris', role: 'VENDEUR' },
  { username: 'doris_caissier', nom: 'Doris', role: 'CAISSIER' },
  { username: 'ameli_vendeur', nom: 'Ameli', role: 'VENDEUR' },
  { username: 'ameli_caissier', nom: 'Ameli', role: 'CAISSIER' },
];

const upsertAccount = async (client, account) => {
  const result = await client.query(
    `
      INSERT INTO admin_user (
        id, username, nom, role, mot_de_passe, pin_code, is_active,
        must_change_credential, failed_login_attempts, locked_until,
        session_version, created_at, updated_at, created_by
      )
      VALUES (
        $1, $2, $3, $4::"AdminRole", $5, $6, TRUE,
        $7, 0, NULL, 0, NOW(), NOW(), $8
      )
      ON CONFLICT (username) DO UPDATE SET
        nom = EXCLUDED.nom,
        role = EXCLUDED.role,
        mot_de_passe = EXCLUDED.mot_de_passe,
        pin_code = EXCLUDED.pin_code,
        is_active = TRUE,
        must_change_credential = EXCLUDED.must_change_credential,
        failed_login_attempts = 0,
        locked_until = NULL,
        session_version = admin_user.session_version + 1,
        updated_at = NOW()
      RETURNING id, username, nom, role, must_change_credential AS "mustChangeCredential"
    `,
    [
      crypto.randomUUID(),
      account.username,
      account.nom,
      account.role,
      account.passwordHash || null,
      account.pinHash || null,
      account.mustChangeCredential,
      account.createdById || null,
    ],
  );
  return result.rows[0];
};

async function main() {
  const client = await pool.connect();
  try {
    if (!apply) {
      const usernames = ['ampere', ...staffAccounts.map(account => account.username)];
      const existing = await client.query(
        'SELECT username, nom, role, must_change_credential AS "mustChangeCredential" FROM admin_user WHERE username = ANY($1::text[]) ORDER BY username',
        [usernames],
      );
      console.log(JSON.stringify({ mode: 'dry-run', existing: existing.rows, requested: usernames }, null, 2));
      return;
    }

    await client.query('BEGIN');
    const ampere = await upsertAccount(client, {
      username: 'ampere',
      nom: 'Ampere',
      role: 'SUPER_ADMIN',
      passwordHash: await bcrypt.hash(amperePassword, 12),
      mustChangeCredential: false,
    });
    const pinHash = await bcrypt.hash(staffTemporaryPin, 10);
    const created = [ampere];
    for (const account of staffAccounts) {
      created.push(await upsertAccount(client, {
        ...account,
        pinHash,
        mustChangeCredential: true,
        createdById: ampere.id,
      }));
    }
    await client.query('COMMIT');
    console.log(JSON.stringify({ mode: 'applied', accounts: created }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
