import { createClientId } from '../utils/clientId';
import { getAdminToken } from './adminSession';

export const QZ_SIGNATURE_URL = '/api/qz/sign';

type QzSigningDependencies = {
  fetcher?: typeof fetch;
  requestId?: string;
  token?: string | null;
};

type QzSignatureResponse = {
  message?: string;
  signature?: string;
};

export async function requestQzSignature(
  hash: string,
  dependencies: QzSigningDependencies = {},
): Promise<string> {
  const fetcher = dependencies.fetcher || globalThis.fetch;
  const token = dependencies.token === undefined ? getAdminToken() : dependencies.token;
  if (!token) {
    throw new Error('Session Newoteg absente. Reconnectez le compte caissier avant d’imprimer.');
  }

  const response = await fetcher(QZ_SIGNATURE_URL, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Request-Id': dependencies.requestId || createClientId('qz'),
    },
    body: JSON.stringify({ request: hash }),
  });

  let payload: QzSignatureResponse = {};
  try {
    payload = await response.json() as QzSignatureResponse;
  } catch {
    // La réponse HTTP suffit pour produire le diagnostic ci-dessous.
  }

  if (!response.ok) {
    throw new Error(payload.message || `Signature QZ refusée par Newoteg (${response.status}).`);
  }
  if (typeof payload.signature !== 'string' || !payload.signature) {
    throw new Error('Signature QZ absente de la réponse Newoteg.');
  }
  return payload.signature;
}
