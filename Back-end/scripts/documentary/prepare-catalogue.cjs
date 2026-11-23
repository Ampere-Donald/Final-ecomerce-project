'use strict';
// Offline preparation only: no database, dotenv, network or credentials.
const fs = require('node:fs'),
  path = require('node:path'),
  { createHash } = require('node:crypto');
const { normalizeContent } = require('./content.cjs');
const { familyContent, profileFor } = require('./family-content.cjs');
const { proposedText, publicationRisks } = require('./policy.cjs');
const read = (p) =>
  fs.readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const jsonl = (rows) => rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
function prepare(snapshot, proposals, output) {
  const rows = read(snapshot).filter((p) => p.active === true),
    prior = new Map(read(proposals).map((p) => [p.id, p]));
  if (
    !rows.length ||
    rows.some((p) => !p.id) ||
    new Set(rows.map((p) => p.id)).size !== rows.length
  )
    throw Error('INVALID_CATALOGUE_IDENTIFIERS');
  if (fs.existsSync(path.join(output, 'manifest.json')))
    throw Error('OUTPUT_EXISTS');
  fs.mkdirSync(path.join(output, 'lots'), { recursive: true, mode: 0o700 });
  const groups = new Map(),
    results = [];
  for (const p of rows) {
    const proposal = prior.get(p.id),
      sources = proposal?.enrichment?.sources || [];
    const documents = [];
    for (const s of sources) {
      try {
        const u = new URL(s.url);
        if (
          u.protocol === 'https:' &&
          !u.username &&
          !u.password &&
          /\.(pdf)(?:$|\?)/i.test(u.href) &&
          /\b(fabricant|manufacturer)\b/i.test(s.nature || '')
        )
          documents.push({
            label: (s.organisme || 'Fabricant') + ' — document de référence',
            url: u.href,
            scope: 'family',
          });
      } catch {}
    }
    const { key, content } = familyContent(p, documents.slice(0, 8));
    let reused = false;
    const existing = p.original.description || '';
    if (
      existing.length >= 140 &&
      !/Composant destiné au montage|Article de connectique.*annoncé|Prix sur demande|fiche à compléter/i.test(
        existing,
      )
    )
      content.locales.fr.paragraphs.unshift(existing);

    try {
      const t = proposedText(proposal);
      if (
        proposal.enrichment.auto_publish_description_eligible === true &&
        !publicationRisks(t).length
      ) {
        if (!content.locales.fr.paragraphs.includes(t.description))
          content.locales.fr.paragraphs.unshift(t.description);
        reused = true;
      }
    } catch {}
    if (String(p.internal_reference) === '123458') {
      content.locales.fr.summary =
        'Condensateur électrolytique polarisé pour le filtrage et le lissage des alimentations, selon les exigences du circuit. Comparez les caractéristiques et l’encombrement avant remplacement.';
      content.locales.fr.paragraphs.unshift(
        'Ce condensateur électrolytique polarisé présente les indications catalogue de 4 700 µF et 63 V. Son choix dépend aussi de la série, des dimensions et des exigences électriques du montage.',
      );
      const url =
        'https://www.nichicon.co.jp/english/series_items/catalog_pdf/e-al_guide.pdf';
      if (!content.locales.fr.documents.some((d) => d.url === url))
        content.locales.fr.documents.push({
          label: 'Nichicon — guide général des électrolytiques aluminium',
          url,
          scope: 'family',
        });
    }
    if (String(p.internal_reference) === '102708') {
      content.locales.fr.summary =
        'VIPer50A : circuit de commande d’alimentation à découpage avec transistor de puissance intégré. Consulter la documentation correspondant au boîtier et à la variante.';
      content.locales.fr.paragraphs.unshift(
        'La documentation ST de la famille VIPer50A décrit une commande PWM associée à un MOSFET de puissance intégré. Les conditions d’alimentation, le brochage et les composants externes doivent être relevés dans la documentation de la variante concernée.',
      );
      const url = 'https://www.st.com/resource/en/datasheet/viper50a-e.pdf';
      if (!content.locales.fr.documents.some((d) => d.url === url))
        content.locales.fr.documents.push({
          label: 'ST — famille VIPer50A-E / ASP-E',
          url,
          scope: 'family',
        });
    }
    const item = {
      id: p.id,
      internal_reference: p.internal_reference,
      original_title: p.original.title,
      source_fingerprint_sha256: p.source_fingerprint_sha256,
      profile: key,
      content: normalizeContent(content),
      review: {
        status: 'requires_live_reconciliation',
        previous_description_reused: reused,
        primary_documents: content.locales.fr.documents.length,
        network_research_completed: false,
        complete: false,
      },
    };
    results.push(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const pilots = [];
  for (const id of ['0899ed76-5a78-406b-beda-9b2685843c44','4f3af812-0f49-4fba-8863-e7eb06fac1e9']) {
    const p = results.find((p) => p.id === id);
    if (!p) throw Error('REQUIRED_PILOT_MISSING');
    pilots.push(p);
  }
  for (const group of groups.values()) {
    if (pilots.length >= 12) break;
    const p = group.find((p) => !pilots.some((x) => x.id === p.id));
    if (p) pilots.push(p);
  }
  for (const p of results) {
    if (pilots.length >= 12) break;
    if (!pilots.some((x) => x.id === p.id)) pilots.push(p);
  }
  const batches = [];
  for (const [profile, items] of groups) {
    items.sort((a, b) => a.id.localeCompare(b.id));
    for (let start = 0; start < items.length; start += 50) {
      const itemsInBatch = items.slice(start, start + 50),
        file = `lots/${String(batches.length + 1).padStart(3, '0')}-${profile}.jsonl`;
      fs.writeFileSync(path.join(output, file), jsonl(itemsInBatch), {
        mode: 0o600,
      });
      batches.push({
        file,
        profile,
        count: itemsInBatch.length,
        ids: itemsInBatch.map((p) => p.id),
      });
    }
  }
  for (const [name, data] of [
    ['catalogue-prepare.jsonl', results],
    ['pilotes.jsonl', pilots],
  ])
    fs.writeFileSync(path.join(output, name), jsonl(data), { mode: 0o600 });
  const manifest = {
    preparedAt: new Date().toISOString(),
    snapshotSha256: createHash('sha256')
      .update(fs.readFileSync(snapshot))
      .digest('hex'),
    products: results.length,
    pilots: pilots.map((p) => p.id),
    profiles: Object.fromEntries([...groups].map(([k, v]) => [k, v.length])),
    batches,
    productionWritten: false,
    liveReconciliationRequired: true,
    networkResearchCompleted: false,
    completedProducts: 0,
  };
  fs.writeFileSync(
    path.join(output, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    { mode: 0o600 },
  );
  return manifest;
}
if (require.main === module) {
  try {
    const [snapshot, proposals, output] = process.argv.slice(2);
    if (!snapshot || !proposals || !output) throw Error('INPUT_PATHS_REQUIRED');
    const m = prepare(snapshot, proposals, output);
    console.log(
      JSON.stringify({
        products: m.products,
        pilots: m.pilots.length,
        batches: m.batches.length,
        productionWritten: false,
        liveReconciliationRequired: true,
      }),
    );
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
module.exports = { prepare };
