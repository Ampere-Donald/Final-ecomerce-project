import test from 'node:test';
import assert from 'node:assert/strict';
import { productMediaBase, productImageUrl } from '../src/utils/productImageUrl.js';

test('Proxy and absolute API deployments resolve uploaded photos on the correct host', () => {
  const cases = [
    ['/api', '/uploads/photo.png'],
    ['/api/', '/uploads/photo.png'],
    ['https://api.newoteg.com/api', 'https://api.newoteg.com/uploads/photo.png'],
    ['https://api.newoteg.com/api/', 'https://api.newoteg.com/uploads/photo.png'],
    ['https://api.newoteg.com', 'https://api.newoteg.com/uploads/photo.png'],
    [undefined, 'http://localhost:3000/uploads/photo.png'],
  ];
  for (const [api, expected] of cases) {
    assert.equal(productImageUrl('/uploads/photo.png', productMediaBase(api)), expected);
    assert.equal(productImageUrl('uploads/photo.png', productMediaBase(api)), expected);
  }
  assert.equal(productImageUrl('https://images.example.invalid/photo.png', ''), 'https://images.example.invalid/photo.png');
});

test('Absent photos and unsafe schemes cannot become image requests', () => {
  for (const raw of [null, undefined, '', {}, '//outside.example.invalid/photo.png', 'javascript:alert(1)', 'data:text/html,fixture']) assert.equal(productImageUrl(raw, ''), null);
});
