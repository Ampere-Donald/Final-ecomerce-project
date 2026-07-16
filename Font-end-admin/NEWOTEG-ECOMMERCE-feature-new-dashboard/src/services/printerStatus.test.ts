import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluatePrinterStatus } from './printerStatus';

test('reconnaît une Epson prête', () => {
  const result = evaluatePrinterStatus([{ eventType: 'PRINTER', severity: 'INFO', statusText: 'OK' }]);
  assert.equal(result.state, 'READY');
});

test('le manque de papier gagne sur un ancien statut OK', () => {
  const result = evaluatePrinterStatus([
    { eventType: 'PRINTER', severity: 'INFO', statusText: 'OK' },
    { eventType: 'PRINTER', severity: 'WARN', statusText: 'PAPER_OUT' },
  ]);
  assert.equal(result.state, 'PAPER_OUT');
  assert.match(result.message, /58 mm/);
});

test('reconnaît le code media-empty remonté par QZ', () => {
  const result = evaluatePrinterStatus([{ eventType: 'JOB', severity: 'WARN', statusCode: 'media-empty' }]);
  assert.equal(result.state, 'PAPER_OUT');
});

test('classe une imprimante hors ligne comme file bloquée', () => {
  const result = evaluatePrinterStatus([{ eventType: 'PRINTER', severity: 'FATAL', statusText: 'OFFLINE' }]);
  assert.equal(result.state, 'QUEUE_BLOCKED');
  assert.match(result.message, /hors ligne/i);
});

test('classe une file en pause comme bloquée', () => {
  const result = evaluatePrinterStatus([{ eventType: 'PRINTER', severity: 'WARN', statusText: 'PAUSED' }]);
  assert.equal(result.state, 'QUEUE_BLOCKED');
});

test('n’invente pas un statut prêt sans événement matériel', () => {
  assert.equal(evaluatePrinterStatus([]).state, 'UNKNOWN');
});
