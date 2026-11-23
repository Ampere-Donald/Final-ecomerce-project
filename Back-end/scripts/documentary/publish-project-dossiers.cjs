'use strict';
// Delegated owner-authorized maintenance; uses the SAME project service checks.
const fs = require('node:fs'),
  path = require('node:path'),
  { randomUUID, createHash } = require('node:crypto');
async function main() {
  if (process.argv[2] !== '--publish-reviewed-projects')
    throw Error('EXPLICIT_PROJECT_PUBLICATION_REQUIRED');
  const [input, out] = process.argv.slice(3);
  if (!input || !out || !process.env.DOCUMENTARY_SOURCE_ENV)
    throw Error('INPUT_AND_SOURCE_REQUIRED');
  const drafts = JSON.parse(fs.readFileSync(input, 'utf8'));
  if (
    drafts.length !== 6 ||
    drafts.some(
      (d) =>
        d.review?.status !== 'ready_documentary_dossier' ||
        d.review.hardwareTested !== false ||
        d.review.kitComplete !== false ||
        d.review.dtoSha256 !== createHash('sha256').update(JSON.stringify(d.dto)).digest('hex'),
    )
  )
    throw Error('PROJECT_DOCUMENTARY_REVIEW_REQUIRED');
  const { Pool } = require('pg'),
    { PrismaPg } = require('@prisma/adapter-pg'),
    { PrismaClient } = require('@prisma/client');
  const { ProjetService } = require(
    path.resolve('dist/src/projet/projet.service.js'),
  );
  const { technicalFingerprint } = require(
    path.resolve('dist/src/projet/projet-data.js'),
  );
  const cfg = require('dotenv').parse(
    fs.readFileSync(process.env.DOCUMENTARY_SOURCE_ENV),
  );
  const pool = new Pool({
    connectionString: cfg.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
    connectionTimeoutMillis: 10000,
  });
  const db = new PrismaClient({
    adapter: new PrismaPg(pool),
    transactionOptions: { maxWait: 10000, timeout: 30000 },
  });
  const service = new ProjetService(db);
  fs.mkdirSync(out, { recursive: true, mode: 0o700 });
  try {
    const accounts = await db.adminUser.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        isActive: true,
        ...(process.env.DOCUMENTARY_ADMIN_USERNAME
          ? { username: process.env.DOCUMENTARY_ADMIN_USERNAME }
          : {}),
        mustChangeCredential: false,
        ...(process.env.DOCUMENTARY_ADMIN_ID
          ? { id: process.env.DOCUMENTARY_ADMIN_ID }
          : {}),
      },
      select: { id: true, role: true },
    });
    if (accounts.length !== 1)
      throw Error('UNAMBIGUOUS_OWNER_ACCOUNT_REQUIRED');
    const actor = accounts[0],
      results = [];
    for (const draft of drafts) {
      // Never replace or silently republish an existing manually managed project.
      const existing = await db.projet.findUnique({
        where: { slug: draft.dto.slug },
      });
      let id;
      if (existing) {
        const receipt = await db.projetEvent.findUnique({
          where: { requestId: draft.dto.requestId },
        });
        if (
          existing.statut === 'BROUILLON' &&
          existing.version === 1 &&
          receipt?.projetId === existing.id &&
          receipt.acteurId === actor.id
        ) {
          id = existing.id;
        } else {
          results.push({
            slug: draft.dto.slug,
            status: 'existing_preserved',
            id: existing.id,
          });
          continue;
        }
      } else {
        id = (await service.create(actor, draft.dto)).projet.id;
      }
      const detail = await service.findAdminOne(actor, id);
      fs.appendFileSync(
        path.join(out, 'created.jsonl'),
        JSON.stringify({
          id,
          slug: draft.dto.slug,
          requestId: draft.dto.requestId,
        }) + '\n',
        { mode: 0o600 },
      );
      const lines = await db.projetLigne.findMany({
        where: { projetId: id },
        include: {
          produit: {
            select: require(path.resolve('dist/src/projet/projet-data.js'))
              .projectProductSelect,
          },
        },
      });
      const published = await service.publish(actor, id, {
        requestId: randomUUID(),
        version: detail.version,
        verifications: lines.map((l) => ({
          ligneId: l.id,
          empreinteTechnique: technicalFingerprint(l.produit),
        })),
        referencesVerifiees: true,
        materielEtQuantitesVerifies: true,
        contraintesEtDocumentsVerifies: true,
        noteValidation:
          'Publication documentaire autorisée par le propriétaire. Références et quantités rapprochées du catalogue actif, ressources et portée relues. Dossiers à dimensionner avec un encadrant, non testés en boutique, aucun kit complet annoncé.',
      });
      results.push({
        slug: draft.dto.slug,
        id: published.projet.id,
        status: 'published_documentary_dossier',
        hardwareTested: false,
        kitComplete: false,
      });
    }
    fs.writeFileSync(
      path.join(out, 'summary.json'),
      JSON.stringify({ results }, null, 2) + '\n',
      { mode: 0o600 },
    );
    console.log(
      JSON.stringify({
        projects: results.length,
        statuses: results.map((r) => r.status),
      }),
    );
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}
if (require.main === module)
  main().catch((e) => {
    console.error(
      JSON.stringify({
        error: /^[A-Z_]+$/.test(e.message)
          ? e.message
          : 'PROJECT_PUBLICATION_INTERRUPTED',
        note: 'Created project IDs are journaled; existing projects are preserved on retry.',
      }),
    );
    process.exitCode = 1;
  });
