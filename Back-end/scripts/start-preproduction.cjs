// Deliberately fail closed; do not invoke ensure-schema or resolve failed migrations.
const path = require('node:path');
const { spawn } = require('node:child_process');
const { readReleaseContract } = require('./release-schema-contract.cjs');

async function startPreproduction(
  run = spawn,
  signals = process,
  checkSources = readReleaseContract,
) {
  // Refuse unreviewed source/schema drift BEFORE any migration can be applied.
  checkSources();
  const root = path.resolve(__dirname, '..');
  const commands = [
    [path.join(root, 'scripts/verify-release-schema.cjs'), '--history-only'],
    [
      path.join(root, 'node_modules/prisma/build/index.js'),
      'migrate',
      'deploy',
    ],
    [path.join(root, 'scripts/verify-release-schema.cjs')],
    [path.join(root, 'dist/src/main.js')],
  ];
  let child;
  let stopSignal;
  const handlers = {};
  for (const signal of ['SIGTERM', 'SIGINT']) {
    handlers[signal] = () => {
      stopSignal ||= signal;
      child?.kill(signal);
    };
    signals.on(signal, handlers[signal]);
  }
  const signalCode = (signal) => (signal === 'SIGINT' ? 130 : 143);
  try {
    for (const args of commands) {
      if (stopSignal) return signalCode(stopSignal);
      const status = await new Promise((resolve) => {
        child = run(process.execPath, args, {
          cwd: root,
          stdio: 'inherit',
          // This wrapper already deploys and checks migrations, without fallback.
          env: { ...process.env, RUN_PRISMA_MIGRATIONS: 'false' },
        });
        child.once('error', () => resolve(1));
        child.once('close', (code, signal) =>
          resolve(signal ? signalCode(signal) : (code ?? 1)),
        );
      });
      child = undefined;
      if (stopSignal) return signalCode(stopSignal);
      if (status !== 0) return status;
    }
    return 0;
  } finally {
    for (const [signal, handler] of Object.entries(handlers)) {
      signals.removeListener(signal, handler);
    }
  }
}
module.exports = { startPreproduction };
if (require.main === module) {
  startPreproduction().then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      console.error(error.message);
      process.exitCode = 1;
    },
  );
}
