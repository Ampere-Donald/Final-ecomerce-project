const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const sharp = require('sharp');
const { AvisService } = require('../dist/src/avis/avis.service');

// Called only after the parent script's exact isolated PostgreSQL guard.
module.exports = async ({
  db,
  base,
  fixture,
  guestFixture,
  clients,
  admins,
  product,
  clientToken,
  adminToken,
  http,
  body,
  consent,
  execute,
  service,
  guestReviews,
  ok,
  failingDb,
}) => {
  const input = await sharp({
    create: { width: 120, height: 80, channels: 3, background: '#397960' },
  })
    .withMetadata({ orientation: 6 })
    .withExif({ IFD0: { Artist: 'Synthetic private author' } })
    .jpeg()
    .toBuffer();
  const photo = input.toString('base64');
  const order = await fixture(),
    dto = { ...body(order.lignes[0].id), photo };
  const created = await http('', clientToken(clients[0]), dto);
  assert.equal(created.status, 200);
  assert.deepEqual(Object.keys(created.data).sort(), ['enregistre', 'id']);
  const id = created.data.id;
  const stored = await db.avisProduit.findUnique({ where: { id } });
  const metadata = await sharp(stored.photoData).metadata();
  assert.equal(metadata.format, 'webp');
  assert.deepEqual([metadata.width, metadata.height], [80, 120]);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.icc, undefined);
  assert.equal(stored.photoStatut, 'EN_ATTENTE');
  assert.notDeepEqual(Buffer.from(stored.photoData), input);
  assert.equal((await http('', clientToken(clients[0]), dto)).data.id, id);
  const otherPhoto = (
    await sharp({
      create: { width: 50, height: 50, channels: 3, background: '#ecbe73' },
    })
      .png()
      .toBuffer()
  ).toString('base64');
  assert.equal(
    (await http('', clientToken(clients[0]), { ...dto, photo: otherPhoto }))
      .status,
    409,
  );
  for (const json of [
    (await http('/admin', adminToken(admins[0]))).data,
    (await http('/commandes/' + order.id, clientToken(clients[0]))).data,
    await service.publicList(product.id),
  ]) {
    assert.ok(!JSON.stringify(json).includes('photoData'));
    assert.ok(!JSON.stringify(json).includes('photoInputHash'));
    assert.ok(!JSON.stringify(json).includes(photo));
  }
  ok(
    'Photo pixels normalized, metadata removed, exact retry bound to original image; JSON never contains bytes',
  );

  async function binary(route, token, payload) {
    const response = await fetch(base + '/api/avis' + route, {
      method: payload ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });
    return {
      status: response.status,
      headers: response.headers,
      bytes: Buffer.from(await response.arrayBuffer()),
    };
  }
  assert.equal((await binary('/' + id + '/photo')).status, 404);
  assert.equal((await binary('/' + id + '/photo-privee')).status, 401);
  assert.equal(
    (await binary('/' + id + '/photo-privee', clientToken(clients[1]))).status,
    404,
  );
  const ownerPhoto = await binary(
    '/' + id + '/photo-privee',
    clientToken(clients[0]),
  );
  assert.equal(ownerPhoto.status, 200);
  assert.equal(ownerPhoto.headers.get('cache-control'), 'private, no-store');
  assert.equal(ownerPhoto.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(ownerPhoto.bytes, Buffer.from(stored.photoData));
  assert.equal(
    (await binary('/admin/' + id + '/photo', adminToken(admins[0]))).status,
    200,
  );
  assert.equal(
    (await binary('/admin/' + id + '/photo', adminToken(admins[2]))).status,
    403,
  );
  ok(
    'Pending photo has no public access; private photo requires current purchase owner or moderator role',
  );

  const moderation = (expectedVersion, extra = {}) => ({
    requestId: randomUUID(),
    expectedVersion,
    action: 'PUBLIER',
    ...extra,
  });
  const route = '/admin/' + id + '/moderation',
    token = adminToken(admins[0]);
  assert.equal((await http(route, token, moderation(1))).status, 400);
  assert.equal(
    (await http(route, token, moderation(1, { photoPubliee: false }))).status,
    400,
  );
  assert.equal(
    (
      await http(
        route,
        token,
        moderation(1, { photoPubliee: false, photoMotif: 'NOTE_NEGATIVE' }),
      )
    ).status,
    400,
  );
  const textOnly = moderation(1, {
    photoPubliee: false,
    photoMotif: 'DONNEES_PERSONNELLES',
  });
  assert.equal((await http(route, token, textOnly)).status, 200);
  assert.equal((await http(route, token, textOnly)).status, 200);
  assert.equal(await db.avisModeration.count({ where: { avisId: id } }), 1);
  let published = (await service.publicList(product.id)).items.find(
    (r) => r.id === id,
  );
  assert.equal(published.note, 1);
  assert.equal(published.photo, undefined);
  assert.equal((await binary('/' + id + '/photo')).status, 404);
  const audit = await db.avisModeration.findFirst({ where: { avisId: id } });
  assert.equal(audit.photoAction, 'REFUSE');
  assert.equal(audit.photoMotif, 'DONNEES_PERSONNELLES');
  assert.equal(
    (await http(route, token, moderation(1, { photoPubliee: true }))).status,
    409,
  );
  assert.equal(
    (await http(route, token, moderation(2, { photoPubliee: true }))).status,
    200,
  );
  published = (await service.publicList(product.id)).items.find(
    (r) => r.id === id,
  );
  assert.deepEqual(published.photo, {
    url: '/api/avis/' + id + '/photo',
    width: 80,
    height: 120,
  });
  const publicPhoto = await binary('/' + id + '/photo');
  assert.equal(publicPhoto.status, 200);
  assert.equal(publicPhoto.headers.get('cache-control'), 'no-store');
  assert.equal(publicPhoto.headers.get('content-type'), 'image/webp');
  assert.equal(
    publicPhoto.headers.get('cross-origin-resource-policy'),
    'cross-origin',
  );
  assert.deepEqual(publicPhoto.bytes, ownerPhoto.bytes);
  // A photo-only correction keeps the negative text visible.
  assert.equal(
    (
      await http(
        route,
        token,
        moderation(3, {
          photoPubliee: false,
          photoMotif: 'DONNEES_PERSONNELLES',
        }),
      )
    ).status,
    200,
  );
  assert.equal(
    (await service.publicList(product.id)).items.find((r) => r.id === id).note,
    1,
  );
  assert.equal((await binary('/' + id + '/photo')).status, 404);
  assert.equal(
    (await http(route, token, moderation(4, { photoPubliee: true }))).status,
    200,
  );
  await db.produit.update({
    where: { id: product.id },
    data: { estActif: false },
  });
  assert.equal((await binary('/' + id + '/photo')).status, 404);
  await db.produit.update({
    where: { id: product.id },
    data: { estActif: true },
  });
  await db.commande.update({
    where: { id: order.id },
    data: { dateLivraison: null },
  });
  assert.equal((await binary('/' + id + '/photo')).status, 404);
  await db.commande.update({
    where: { id: order.id },
    data: { dateLivraison: new Date() },
  });
  ok(
    'Photo requires explicit separate moderation; compliant negative text survives photo refusal and public access rereads proof',
  );

  const rollback = await fixture();
  const result = await service.create(clients[0].id, {
    ...body(rollback.lignes[0].id),
    photo,
  });
  await assert.rejects(
    new AvisService(failingDb).moderate(
      admins[0].id,
      result.id,
      moderation(1, { photoPubliee: true }),
    ),
    /Injected audit failure/,
  );
  const unchanged = await db.avisProduit.findUnique({
    where: { id: result.id },
  });
  assert.equal(unchanged.statut, 'EN_ATTENTE');
  assert.equal(unchanged.photoStatut, 'EN_ATTENTE');
  assert.equal(unchanged.version, 1);
  const noPhoto = await service.create(
    clients[0].id,
    body(rollback.lignes[1].id),
  );
  assert.equal(
    (
      await http(
        '/admin/' + noPhoto.id + '/moderation',
        token,
        moderation(1, { photoPubliee: true }),
      )
    ).status,
    400,
  );
  ok(
    'Photo/text moderation and audit roll back together; absent photo cannot receive a fabricated decision',
  );

  const invalidOrder = await fixture();
  const invalidDto = {
    ...body(invalidOrder.lignes[0].id),
    photo: Buffer.concat([
      Buffer.from([255, 216, 255]),
      Buffer.alloc(20),
    ]).toString('base64'),
  };
  assert.equal(
    (await http('', clientToken(clients[0]), invalidDto)).status,
    400,
  );
  assert.equal(
    await db.avisProduit.count({
      where: { ligneCommandeId: invalidDto.ligneCommandeId },
    }),
    0,
  );
  const largeInput = await sharp(randomBytes(600 * 400 * 3), {
    raw: { width: 600, height: 400, channels: 3 },
  })
    .jpeg({ quality: 75 })
    .toBuffer();
  assert.ok(largeInput.length > 100 * 1024 && largeInput.length < 256 * 1024);
  assert.equal(
    (
      await http('', clientToken(clients[0]), {
        ...body(invalidOrder.lignes[1].id),
        photo: largeInput.toString('base64'),
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await binary('', clientToken(clients[0]), {
        ...invalidDto,
        photo: 'A'.repeat(600000),
      })
    ).status,
    413,
  );
  // Database constraints also protect internal writes.
  await assert.rejects(
    db.avisProduit.update({
      where: { id: result.id },
      data: { photoWidth: 1281 },
    }),
  );
  ok(
    'Invalid image cannot create a review; 100 KiB-plus image accepted, 512 KiB body ceiling and SQL bounds enforced',
  );

  const guest = await guestFixture();
  guest.dto.photo = photo;
  const confirmed = await consent(guest);
  await assert.rejects(
    execute(confirmed, confirmed.code, { ...guest.dto, photo: otherPhoto }),
    (e) => e.getStatus?.() === 401,
  );
  const guestResult = await execute(confirmed);
  const payload = { accessToken: guest.token, avisId: guestResult.id };
  assert.equal((await binary('/guest/photo', undefined, payload)).status, 200);
  assert.equal(
    (
      await binary('/guest/photo', undefined, {
        ...payload,
        accessToken: randomBytes(32).toString('base64url'),
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await binary('/guest/photo', undefined, {
        accessToken: guest.token,
        avisId: id,
      })
    ).status,
    404,
  );
  await db.commandeGuestAccess.update({
    where: { commandeId: guest.order.id },
    data: { revokedAt: new Date(), version: { increment: 1 } },
  });
  assert.equal((await binary('/guest/photo', undefined, payload)).status, 404);
  assert.deepEqual(await execute(confirmed, null), guestResult);
  await assert.rejects(
    guestReviews.request(randomBytes(32).toString('base64url'), invalidDto),
    (e) => e.getStatus?.() === 401,
  );
  ok(
    'Guest consent binds the photo, private access stops on revocation, minimal committed receipt remains replayable',
  );
};
