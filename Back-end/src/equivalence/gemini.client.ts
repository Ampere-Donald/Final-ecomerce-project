import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Fin wrapper autour de l'API REST Gemini (free tier via Google AI Studio).
 * Utilise le `fetch` global de Node 20+. Force une sortie JSON via responseSchema.
 */
@Injectable()
export class GeminiClient {
  private readonly logger = new Logger(GeminiClient.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return !!this.config.get<string>('GEMINI_API_KEY');
  }

  async generateJson(
    prompt: string,
    schema: unknown,
    timeoutMs = 12000,
  ): Promise<any> {
    const key = this.config.get<string>('GEMINI_API_KEY');
    if (!key) {
      throw new ServiceUnavailableException(
        'Service IA non configuré (GEMINI_API_KEY manquante).',
      );
    }
    const model = this.config.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            temperature: 0.2,
          },
        }),
        signal: controller.signal,
      });
    } catch {
      throw new ServiceUnavailableException(
        'Service IA momentanément injoignable. Réessayez dans un instant.',
      );
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 429) {
      throw new ServiceUnavailableException(
        'Quota IA atteint. Réessayez dans une minute.',
      );
    }
    if (!res.ok) {
      this.logger.warn(`Gemini HTTP ${res.status}`);
      throw new ServiceUnavailableException(
        'Le service IA a renvoyé une erreur. Réessayez plus tard.',
      );
    }

    const data: any = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new ServiceUnavailableException('Réponse IA vide.');
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new ServiceUnavailableException('Réponse IA illisible.');
    }
  }
}
