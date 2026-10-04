// Read-only HTTP requests against the existing local full main runtime and Vite.
// A uniquely named copy of an approved image is removed in finally. No DB write.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const http = require('node:http');
const assert = require('node:assert/strict');
const output = process.env.NEWOTEG_SEO_OUTPUT;
if (!output || !path.isAbsolute(output)) throw Error('Absolute evidence directory required');
const uploads = path.resolve(__dirname, '../../Back-end/.local-postgres/full-main-preview/uploads');
const source = path.resolve(__dirname, '../public/design-e/multimetre.webp');
const name = `media-check-${crypto.randomUUID()}.webp`;
const target = path.join(uploads, name);
assert.equal(path.dirname(target), uploads);
function read(port, pathname) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port, path: pathname, timeout: 10000 }, response => {
      const chunks = [];
      response.on('data', data => chunks.push(data));
      response.on('end', () => resolve({ status: response.statusCode, type: response.headers['content-type'], body: Buffer.concat(chunks) }));
      response.on('error', reject);
    }).on('error', reject).on('timeout', function () { this.destroy(Error('Local media timeout')); });
  });
}
(async () => {
  const checks = [];
  try {
    assert.ok(fs.existsSync(uploads), 'Existing dedicated local preview uploads required');
    const expected = fs.readFileSync(source);
    fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
    for (const port of [3000, 5187, 5188]) {
      const response = await read(port, `/uploads/${name}`);
      assert.equal(response.status, 200, `Media HTTP status on ${port}`);
      assert.match(response.type, /^image\/webp/, `Media type on ${port}`);
      assert.deepEqual(response.body, expected, `Unchanged image bytes on ${port}`);
      checks.push({ port, status: response.status, contentType: response.type, bytes: response.body.length });
    }
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'local-media-result.json'), JSON.stringify({ status: 'passed', checks, limits: 'Owned temporary static asset, no real catalogue record or deployment tested' }, null, 2));
    console.log(JSON.stringify({ status: 'passed', checks }));
  } finally {
    if (fs.existsSync(target)) fs.unlinkSync(target);
    assert.equal(fs.existsSync(target), false);
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
