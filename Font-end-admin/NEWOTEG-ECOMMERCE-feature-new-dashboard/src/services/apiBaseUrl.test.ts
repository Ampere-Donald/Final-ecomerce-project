import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { resolveApiBaseUrl, resolveProductImageUrl } from './apiBaseUrl';

test('production uses the same HTTPS origin even when the build configured Railway directly', () => {
  assert.equal(resolveApiBaseUrl('https://api.newoteg.com', 'admin.newoteg.com'), '/api');
  assert.equal(resolveApiBaseUrl('https://api.newoteg.com/api', 'admin.newoteg.com'), '/api');
  assert.equal(resolveApiBaseUrl('https://api.newoteg.com', 'newoteg-admin.fotsodonaldampere.workers.dev'), '/api');
  assert.equal(resolveApiBaseUrl('https://api.newoteg.com', '123-newoteg-admin.fotsodonaldampere.workers.dev'), '/api');
});

test('development and other hosts retain their configured endpoint with one API suffix', () => {
  assert.equal(resolveApiBaseUrl(undefined, 'localhost'), '/api');
  assert.equal(resolveApiBaseUrl('http://localhost:3000/', 'localhost'), 'http://localhost:3000/api');
  assert.equal(resolveApiBaseUrl('http://localhost:3000/api/', 'localhost'), 'http://localhost:3000/api');
});

test('product uploads also use the proxy without corrupting the api hostname', () => {
  assert.equal(resolveProductImageUrl('/uploads/p.png', 'https://api.newoteg.com/api', 'admin.newoteg.com'), '/uploads/p.png');
  assert.equal(resolveProductImageUrl('https://api.newoteg.com/uploads/p.png', undefined, 'admin.newoteg.com'), '/uploads/p.png');
  assert.equal(resolveProductImageUrl('/uploads/p.png', 'https://api.newoteg.com/api', 'localhost'), 'https://api.newoteg.com/uploads/p.png');
  assert.equal(resolveProductImageUrl('https://res.cloudinary.com/shop/image.png', undefined, 'admin.newoteg.com'), 'https://res.cloudinary.com/shop/image.png');
});
