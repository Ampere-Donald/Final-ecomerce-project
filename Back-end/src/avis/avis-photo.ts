import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import sharp from 'sharp';

export const REVIEW_PHOTO_LIMIT = 256 * 1024;
let processing = 0;
export function photoInput(value?: string | null): Buffer | null {
  if (value == null) return null;
  if (
    typeof value !== 'string' ||
    value.length > 349528 ||
    value.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(value)
  )
    throw invalid();
  const buffer = Buffer.from(value, 'base64');
  if (
    buffer.length < 16 ||
    buffer.length > REVIEW_PHOTO_LIMIT ||
    buffer.toString('base64') !== value
  )
    throw invalid();
  const jpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  const png = buffer
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp =
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP';
  if (!jpeg && !png && !webp) throw invalid();
  return buffer;
}
export function photoSignature(value?: string | null) {
  const buffer = photoInput(value);
  return buffer ? createHash('sha256').update(buffer).digest('hex') : null;
}
export async function preparePhoto(value?: string | null) {
  const input = photoInput(value);
  if (!input) return {};
  if (processing >= 2)
    throw new ServiceUnavailableException(
      'Traitement des photos occupé. Conservez votre tentative et réessayez.',
    );
  processing++;
  try {
    const image = sharp(input, {
      limitInputPixels: 12_000_000,
      failOn: 'warning',
    }).timeout({ seconds: 3 });
    const metadata = await image.metadata();
    if (
      !['jpeg', 'png', 'webp'].includes(metadata.format || '') ||
      (metadata.pages || 1) !== 1
    )
      throw invalid();
    // Re-encode pixels only: no original bytes, EXIF/GPS/XMP/IPTC or filename.
    const { data, info } = await image
      .rotate()
      .resize({
        width: 1280,
        height: 1280,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    if (data.length > REVIEW_PHOTO_LIMIT || !info.width || !info.height)
      throw invalid();
    return {
      photoData: new Uint8Array(data),
      photoWidth: info.width,
      photoHeight: info.height,
      photoStatut: 'EN_ATTENTE' as const,
    };
  } catch {
    throw invalid();
  } finally {
    processing--;
  }
}
function invalid() {
  return new BadRequestException(
    'Photo invalide. Choisissez une image JPEG, PNG ou WebP fixe, préparée à moins de 256 Ko.',
  );
}
