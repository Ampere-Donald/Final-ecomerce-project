import { ConfigService } from '@nestjs/config';
import { GeminiClient } from './gemini.client';

describe('GeminiClient bounded requests', () => {
  const client = () =>
    new GeminiClient(
      new ConfigService({ GEMINI_API_KEY: 'test-placeholder-only' }),
    );
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });
  it('interrompt aussi la lecture du corps après réception des en-têtes', async () => {
    jest.useFakeTimers();
    jest.spyOn(global, 'fetch').mockImplementation(
      async (_url, options) =>
        ({
          ok: true,
          status: 200,
          json: () =>
            new Promise((_resolve, reject) =>
              options?.signal?.addEventListener('abort', () =>
                reject(new Error('aborted')),
              ),
            ),
        }) as Response,
    );
    const request = client().generateJson('test', {}, 1000);
    const outcome = expect(request).rejects.toThrow(
      'Reponse IA interrompue ou illisible.',
    );
    await jest.advanceTimersByTimeAsync(1000);
    await outcome;
    expect(jest.getTimerCount()).toBe(0);
  });
  it('distingue une indisponibilité HTTP sans révéler la réponse du fournisseur', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: false, status: 503 } as Response);
    await expect(client().generateJson('test', {})).rejects.toThrow(
      'Le service IA a renvoye une erreur.',
    );
  });
  it('accepte une réponse structurée valide', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            { content: { parts: [{ text: '{"suggestions":[]}' }] } },
          ],
        }),
      } as Response);
    await expect(client().generateJson('test', {})).resolves.toEqual({
      suggestions: [],
    });
  });
});
