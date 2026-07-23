import { getAdminToken } from './adminSession';

type SseErrorHandler = (error: unknown) => void;

const rawUrl = import.meta.env.VITE_API_URL || '/api';
const API_BASE_URL = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`;

function dispatchEventData<T>(block: string, onMessage: (data: T) => void): void {
  const payload = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n');

  if (!payload) return;
  onMessage(JSON.parse(payload) as T);
}

export function subscribeAuthenticatedSse<T>(
  path: string,
  onMessage: (data: T) => void,
  onError?: SseErrorHandler,
): () => void {
  const controller = new AbortController();

  void (async () => {
    const token = getAdminToken();
    if (!token) throw new Error('Session administrateur absente.');

    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Accept: 'text/event-stream',
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`Connexion temps réel refusée (${response.status}).`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (!controller.signal.aborted) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() || '';

      for (const block of blocks) {
        try {
          dispatchEventData(block, onMessage);
        } catch {
          // Un événement mal formé ne doit pas interrompre tout le flux.
        }
      }

      if (done) break;
    }
  })().catch((error) => {
    if (!controller.signal.aborted) onError?.(error);
  });

  return () => controller.abort();
}
