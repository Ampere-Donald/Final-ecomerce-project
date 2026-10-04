import sharp from 'sharp';
import { randomBytes } from 'crypto';
import { photoInput, photoSignature, preparePhoto } from './avis-photo';

describe('Review photo decoding', () => {
  const image = () =>
    sharp({
      create: { width: 120, height: 80, channels: 3, background: '#287a63' },
    });
  it('accepts static JPEG, PNG and WebP, retaining only bounded WebP pixels', async () => {
    for (const format of ['jpeg', 'png', 'webp'] as const) {
      const input = await image().toFormat(format).toBuffer();
      const result = await preparePhoto(input.toString('base64'));
      const metadata = await sharp(result.photoData).metadata();
      expect(metadata.format).toBe('webp');
      expect([result.photoWidth, result.photoHeight]).toEqual([120, 80]);
      expect(result.photoStatut).toBe('EN_ATTENTE');
      expect(result.photoData!.length).toBeLessThanOrEqual(262144);
      expect(photoSignature(input.toString('base64'))).toMatch(
        /^[a-f0-9]{64}$/,
      );
    }
  });
  it('corrects orientation and removes EXIF, XMP, ICC and original bytes', async () => {
    const input = await image()
      .withMetadata({ orientation: 6 })
      .withExif({ IFD0: { Artist: 'Synthetic private owner' } })
      .withXmp(
        '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" dc:creator="private fixture"/></rdf:RDF></x:xmpmeta>',
      )
      .jpeg()
      .toBuffer();
    const before = await sharp(input).metadata();
    expect(before.exif).toBeDefined();
    expect(before.xmp).toBeDefined();
    expect(before.icc).toBeDefined();
    const output = await preparePhoto(input.toString('base64'));
    const after = await sharp(output.photoData).metadata();
    expect([after.width, after.height]).toEqual([80, 120]);
    expect(after.exif).toBeUndefined();
    expect(after.xmp).toBeUndefined();
    expect(after.icc).toBeUndefined();
    expect(Buffer.from(output.photoData!).equals(input)).toBe(false);
  });
  it('rejects noncanonical base64, URLs, SVG, GIF, truncated and oversized bytes', async () => {
    for (const input of [
      'https://example.invalid/photo.png',
      '<svg/>',
      Buffer.from('GIF89a'.repeat(4)).toString('base64'),
      'AAAA===',
    ]) {
      expect(() => photoInput(input)).toThrow();
    }
    const truncated = Buffer.concat([
      Buffer.from([255, 216, 255]),
      Buffer.alloc(20),
    ]);
    await expect(preparePhoto(truncated.toString('base64'))).rejects.toThrow();
    const oversized = Buffer.concat([
      Buffer.from([255, 216, 255]),
      Buffer.alloc(262144),
    ]);
    expect(() => photoInput(oversized.toString('base64'))).toThrow();
    expect(await preparePhoto(undefined)).toEqual({});
  });
  it('rejects animated WebP and excessive decoded pixel dimensions', async () => {
    const frames = await Promise.all([
      sharp({
        create: { width: 120, height: 80, channels: 3, background: '#b95b38' },
      })
        .png()
        .toBuffer(),
      image().png().toBuffer(),
    ]);
    const animation = await sharp(frames, { join: { animated: true } })
      .webp({ delay: [100, 100] })
      .toBuffer();
    expect((await sharp(animation).metadata()).pages).toBe(2);
    await expect(preparePhoto(animation.toString('base64'))).rejects.toThrow();
    const large = await sharp({
      create: { width: 4000, height: 4000, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();
    expect(large.length).toBeLessThan(262144);
    await expect(preparePhoto(large.toString('base64'))).rejects.toThrow();
  });
  it('handles a real image larger than 100 KiB without regex stack overflow', async () => {
    const input = await sharp(randomBytes(600 * 400 * 3), {
      raw: { width: 600, height: 400, channels: 3 },
    })
      .jpeg({ quality: 75 })
      .toBuffer();
    expect(input.length).toBeGreaterThan(100 * 1024);
    expect(input.length).toBeLessThan(262144);
    expect(photoInput(input.toString('base64'))).toEqual(input);
    expect((await preparePhoto(input.toString('base64'))).photoWidth).toBe(600);
  });
});
