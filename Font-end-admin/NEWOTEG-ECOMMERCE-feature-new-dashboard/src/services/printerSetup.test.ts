import assert from 'node:assert/strict';
import test from 'node:test';
import { findSupportedEpsonUsbDevice, isUsablePrinterQueueName, isWindowsDevice } from './printerSetup';

test('reconnaît exactement l’Epson TM-T20II de la boutique', () => {
  const result = findSupportedEpsonUsbDevice([
    { vendorId: '0x04B8', productId: '0x0E15', manufacturer: 'EPSON' },
  ]);
  assert.equal(result?.model, 'Epson TM-T20II');
  assert.equal(result?.normalizedProductId, '0e15');
});

test('accepte aussi les identifiants USB numériques de QZ Tray', () => {
  const result = findSupportedEpsonUsbDevice([{ vendorId: 0x04b8, productId: 0x0e15 }]);
  assert.equal(result?.normalizedVendorId, '04b8');
});

test('refuse un autre modèle Epson', () => {
  assert.equal(findSupportedEpsonUsbDevice([{ vendorId: '04b8', productId: '0202' }]), null);
});

test('réserve l’assistant local aux ordinateurs Windows', () => {
  assert.equal(isWindowsDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), true);
  assert.equal(isWindowsDevice('Mozilla/5.0 (Linux; Android 14)'), false);
});

test('exclut le Coupon Generator qui imprime volontairement vers nul:', () => {
  assert.equal(isUsablePrinterQueueName('EPSON Coupon Generator(TM-T20II)'), false);
  assert.equal(isUsablePrinterQueueName('EPSON CGenerator(TM-T20 Series)'), false);
  assert.equal(isUsablePrinterQueueName('EPSON TM-T20II Receipt5'), true);
});
