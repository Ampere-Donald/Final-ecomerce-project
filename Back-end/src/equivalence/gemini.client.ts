import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Thin wrapper around the Gemini REST API.
 * The API key stays on the backend and responses are forced to JSON.
 */
@Injectable()
export class GeminiClient {
  private readonly logger = new Logger(GeminiClient.name);

  constructor(private readonly config: ConfigService) {}

  getModel(): string {
    return this.config.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';
  }

  isConfigured(): boolean {
    return !!this.config.get<string>('GEMINI_API_KEY');
  }

  async health() {
    const model = this.getModel();
    if (!this.isConfigured()) {
      return {
        configured: false,
        model,
        ok: false,
        message: 'Cle GEMINI_API_KEY manquante.',
      };
    }

    try {
      const result = await this.generateJson(
        'Reponds uniquement avec {"ok":true}.',
        {
          type: 'OBJECT',
          properties: { ok: { type: 'BOOLEAN' } },
          required: ['ok'],
        },
        8000,
      );
      const ok = result?.ok === true;
      return {
        configured: true,
        model,
        ok,
        message: ok ? 'Gemini Flash operationnel.' : 'Reponse Gemini inattendue.',
      };
    } catch (error: any) {
      const response = error?.getResponse?.();
      const message =
        typeof response === 'object' && response?.message
          ? response.message
          : error?.message || 'Test Gemini impossible.';
      return { configured: true, model, ok: false, message };
    }
  }

  async generateJson(
    prompt: string,
    schema: unknown,
    timeoutMs = 12000,
  ): Promise<any> {
    const key = this.config.get<string>('GEMINI_API_KEY');
    if (!key) {
      throw new ServiceUnavailableException(
        'Service IA non configure (GEMINI_API_KEY manquante).',
      );
    }

    const model = this.getModel();
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
        'Service IA momentanement injoignable. Reessayez dans un instant.',
      );
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 429) {
      throw new ServiceUnavailableException(
        'Quota IA atteint. Reessayez dans une minute.',
      );
    }
    if ([400, 401, 403].includes(res.status)) {
      this.logger.warn(`Gemini HTTP ${res.status}`);
      throw new ServiceUnavailableException(
        'Cle GEMINI_API_KEY invalide ou non autorisee.',
      );
    }
    if (res.status === 404) {
      this.logger.warn(`Gemini HTTP ${res.status}`);
      throw new ServiceUnavailableException(
        `Modele Gemini indisponible: ${model}.`,
      );
    }
    if (!res.ok) {
      this.logger.warn(`Gemini HTTP ${res.status}`);
      throw new ServiceUnavailableException(
        'Le service IA a renvoye une erreur. Reessayez plus tard.',
      );
    }

    const data: any = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new ServiceUnavailableException('Reponse IA vide.');
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new ServiceUnavailableException('Reponse IA illisible.');
    }
  }
}
