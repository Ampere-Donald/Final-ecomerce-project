'use strict';
// Explicit review of editorial guidance against the current export. It does not
// certify hardware, infer missing ratings, or approve substitutions.
const fs = require('node:fs'),
  path = require('node:path'),
  { createHash } = require('node:crypto');
const { normalizeContent } = require('./content.cjs');
const { englishContent } = require('./english-content.cjs');
const read = (p) =>
  fs.readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const digest = (c) =>
  createHash('sha256').update(JSON.stringify(c)).digest('hex');
// Spread the remainder across family batches instead of emitting a tiny tail.
const balancedBatches = (rows) => {
  const count = Math.ceil(rows.length / 50), batches = [];
  let start = 0;
  for (let index = 0; index < count; index++) {
    const size = Math.ceil((rows.length - start) / (count - index));
    batches.push(rows.slice(start, start + size));
    start += size;
  }
  return batches;
};
const generalSources = {
  resistance: {
    label: 'Vishay — principes des résistances fixes',
    url: 'https://www.vishay.com/docs/28771/basics.pdf',
    scope: 'family',
  },
  relais: {
    label: 'Omron — principes et terminologie des relais',
    url: 'https://www.ia.omron.com/support/guide/36/further_information.html',
    scope: 'family',
  },
};
async function review(prepared, snapshot, out, probesFile) {
  const originals = new Map(read(snapshot).map((p) => [p.id, p]));
  const rows = read(prepared),
    probes = JSON.parse(fs.readFileSync(probesFile, 'utf8'));
  const allowed = new Set(
    probes.filter((p) => p.available === true).map((p) => p.url),
  );
  const ready = [],
    held = [];
  for (const row of rows) {
    const original = originals.get(row.id);
    if (
      !original ||
      original.source_fingerprint_sha256 !== row.source_fingerprint_sha256
    )
      throw Error('SNAPSHOT_CHANGED');
    const c = row.content;
    if (
      generalSources[row.profile] &&
      !c.locales.fr.documents.some(
        (d) => d.url === generalSources[row.profile].url,
      )
    )
      c.locales.fr.documents.push(generalSources[row.profile]);
    c.locales.fr.documents = c.locales.fr.documents.filter((d) =>
      allowed.has(d.url),
    );
    // Unknown reference identity is central. Other missing data does not block
    // documented catalogue information and clearly scoped family-level guidance.
    if (
      /référence (?:exacte |complète )?(?:à confirmer|inconnue)|non identifi[ée]|identification insuffisante/i.test(
        row.original_title,
      )
    ) {
      held.push({
        ...row,
        review: {
          ...row.review,
          status: 'held_reference_identity',
          complete: false,
        },
      });
      continue;
    }
    const content = normalizeContent(c);
    const item = {
      ...row,
      content,
      review: {
        status: 'ready',
        checkedAt: new Date().toISOString(),
        contentSha256: digest(content),
        basis: 'current_catalogue_and_scoped_editorial_guidance',
        primaryDocuments: content.locales.fr.documents.length,
        productSpecificationsAdded: false,
        completeness:
          row.profile === 'equipement'
            ? 'catalogue_guidance'
            : 'family_guidance',
        complete: false,
      },
    };
    ready.push(item);
  }
  if (ready.length + held.length !== originals.size)
    throw Error('INCOMPLETE_COVERAGE');
  if (fs.existsSync(path.join(out, 'manifest.json')))
    throw Error('OUTPUT_EXISTS');
  fs.mkdirSync(path.join(out, 'lots'), { recursive: true, mode: 0o700 });
  const write = (file, data) =>
    fs.writeFileSync(
      path.join(out, file),
      data.map((p) => JSON.stringify(p)).join('\n') + (data.length ? '\n' : ''),
      { mode: 0o600 },
    );
  const pilotIds = read(path.join(path.dirname(prepared), 'pilotes.jsonl')).map(
    (p) => p.id,
  );
  const pilots = ready.filter((p) => pilotIds.includes(p.id));
  write('pilotes.jsonl', pilots);
  write('a-clarifier.jsonl', held);
  write('catalogue-pret.jsonl', ready);
  const batches = [];
  for (const family of [...new Set(ready.map((p) => p.content.family))]) {
    const group = ready.filter(
      (p) => p.content.family === family && !pilotIds.includes(p.id),
    );
    for (const batch of balancedBatches(group)) {
      const file = `lots/${String(batches.length + 1).padStart(3, '0')}-${family}.jsonl`;
      write(file, batch);
      batches.push({ file, products: batch.length });
    }
  }
  // English is prepared separately so the French rollout remains first.
  const english = ready.map((row) => {
    const content = normalizeContent(
      englishContent(row.content, row.profile, originals.get(row.id)),
    );
    return {
      ...row,
      content,
      review: {
        ...row.review,
        contentSha256: digest(content),
        englishCoverage:
          'authored_family_guidance; prior French-specific paragraphs are not represented as translated',
      },
    };
  });
  fs.mkdirSync(path.join(out, 'anglais'), { mode: 0o700 });
  balancedBatches(english).forEach((batch, index) =>
    write(`anglais/${String(index + 1).padStart(3, '0')}.jsonl`, batch),
  );
  const manifest = {
    products: rows.length,
    ready: ready.length,
    held: held.length,
    pilots: pilots.length,
    batches,
    englishBatches: Math.ceil(english.length / 50),
    productSpecificationsAdded: false,
    productionWritten: false,
  };
  fs.writeFileSync(
    path.join(out, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    { mode: 0o600 },
  );
  return manifest;
}
if (require.main === module)
  review(...process.argv.slice(2))
    .then((m) => console.log(JSON.stringify(m)))
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    });
module.exports = { review };
