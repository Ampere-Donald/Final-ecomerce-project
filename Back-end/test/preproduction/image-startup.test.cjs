const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const verifier = path.join(root, 'scripts/verify-release-image.cjs');

for (const [name, dockerfile] of [
  ['preproduction', path.join(root, 'Dockerfile.preproduction')],
  ['catalogue', path.join(root, '../Dockerfile.catalogue')],
]) {
  test(`${name}: shipped release guards load and match the source contract`, () => {
    const image = fs.mkdtempSync(
      path.join(os.tmpdir(), 'newoteg-image-startup-'),
    );
    try {
      fs.copyFileSync(
        path.join(root, 'package.json'),
        path.join(image, 'package.json'),
      );
      fs.copyFileSync(
        path.join(root, 'prisma.config.ts'),
        path.join(image, 'prisma.config.ts'),
      );
      fs.cpSync(path.join(root, 'prisma'), path.join(image, 'prisma'), {
        recursive: true,
      });
      fs.mkdirSync(path.join(image, 'dist/src'), { recursive: true });
      fs.writeFileSync(
        path.join(image, 'dist/src/main.js'),
        '// Never executed by this packaging test.',
      );
      fs.mkdirSync(path.join(image, 'scripts'));
      // Reproduce only the explicit final-stage script COPY from the Dockerfile.
      const copy = fs
        .readFileSync(dockerfile, 'utf8')
        .split(/\r?\n/)
        .find(
          (line) => line.startsWith('COPY ') && line.endsWith('./scripts/'),
        );
      assert.ok(copy, 'Final-stage release script COPY must be explicit');
      for (const token of copy
        .split(/\s+/)
        .filter((token) => /scripts\//.test(token) && token !== './scripts/')) {
        const relative = token.replace(/^Back-end\//, '');
        fs.copyFileSync(
          path.join(root, relative),
          path.join(image, 'scripts', path.basename(relative)),
        );
        if (name === 'preproduction') {
          const ignore = fs.readFileSync(
            path.join(root, 'Dockerfile.preproduction.dockerignore'),
            'utf8',
          );
          assert.ok(
            ignore.split(/\r?\n/).includes('!' + relative),
            `${relative} excluded by image allowlist`,
          );
        }
      }
      const result = spawnSync(
        process.execPath,
        [
          '-e',
          `process.stdout.write(JSON.stringify(require(${JSON.stringify(verifier)}).verifyReleaseImage(${JSON.stringify(image)})))`,
        ],
        {
          encoding: 'utf8',
          env: { ...process.env, NODE_PATH: path.join(root, 'node_modules') },
          windowsHide: true,
        },
      );
      assert.equal(result.status, 0, result.stderr);
      const proof = JSON.parse(result.stdout);
      assert.equal(proof.status, 'passed');
      assert.equal(proof.databaseConnected, false);
      assert.equal(proof.migrationsRun, false);
      assert.equal(proof.applicationStarted, false);
    } finally {
      fs.rmSync(image, { recursive: true, force: true });
    }
  });
}
