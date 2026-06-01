import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { DatabaseService } from 'src/database/database.service';
import { GeminiClient } from './gemini.client';
import { SuggestEquivalenceDto } from './dto/suggest-equivalence.dto';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const MAX_CANDIDATS = 300;
const MAX_SUGGESTIONS = 5;

/** Schéma JSON forcé renvoyé par Gemini. */
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    suggestions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          produitId: { type: 'STRING' },
          raison: { type: 'STRING' },
          compatibilite: { type: 'STRING', enum: ['haute', 'moyenne', 'faible'] },
          avertissement: { type: 'STRING' },
        },
        required: ['produitId', 'raison', 'compatibilite'],
      },
    },
  },
  required: ['suggestions'],
};

interface CandidatProduit {
  id: string;
  nomProduit: string;
  marque: string | null;
  description: string | null;
  categorie: string | null;
  quantiteStock: number;
  prixDetail: number | null;
  prixPromo: number | null;
  imageUrl: string | null;
}

@Injectable()
export class EquivalenceService {
  private readonly logger = new Logger(EquivalenceService.name);
  private readonly cache = new Map<string, { at: number; value: any }>();

  constructor(
    private readonly db: DatabaseService,
    private readonly gemini: GeminiClient,
  ) {}

  // ── Pré-filtre : restreindre le catalogue à un sous-ensemble plausible ──

  private async candidatsParProduit(produitId: string): Promise<{
    cible: any;
    candidats: CandidatProduit[];
  }> {
    const cible = await this.db.produit.findUnique({
      where: { id: produitId },
      include: { categorie: { select: { nom: true } } },
    });
    if (!cible) throw new BadRequestException('Produit ciblé introuvable.');

    const produits = await this.db.produit.findMany({
      where: {
        categorieId: cible.categorieId,
        quantiteStock: { gt: 0 },
        id: { not: produitId },
      },
      include: { categorie: { select: { nom: true } } },
      take: MAX_CANDIDATS,
    });
    return { cible, candidats: produits.map((p) => this.mapCandidat(p)) };
  }

  private async candidatsParTexte(query: string): Promise<CandidatProduit[]> {
    const q = query.trim();
    const firstWord = q.split(/\s+/)[0] || q;
    const insensitive = 'insensitive' as const;

    const produits = await this.db.produit.findMany({
      where: {
        quantiteStock: { gt: 0 },
        OR: [
          { nomProduit: { contains: firstWord, mode: insensitive } },
          { marque: { contains: firstWord, mode: insensitive } },
          { description: { contains: q, mode: insensitive } },
          { categorie: { nom: { contains: firstWord, mode: insensitive } } },
        ],
      },
      include: { categorie: { select: { nom: true } } },
      take: MAX_CANDIDATS,
    });

    return produits.map((p) => this.mapCandidat(p));
  }

  private mapCandidat(p: any): CandidatProduit {
    return {
      id: p.id,
      nomProduit: p.nomProduit,
      marque: p.marque ?? null,
      description: p.description ?? null,
      categorie: p.categorie?.nom ?? null,
      quantiteStock: p.quantiteStock,
      prixDetail: p.prixDetail ?? null,
      prixPromo: p.prixPromo ?? null,
      imageUrl: p.imageUrl ?? null,
    };
  }

  // ── Construction du prompt (prix volontairement exclus) ─────────────────

  private buildPrompt(query: string, candidats: CandidatProduit[]): string {
    const liste = candidats
      .map((c) => {
        const desc = (c.description || '').slice(0, 160).replace(/\s+/g, ' ');
        return `- id:${c.id} | ${c.nomProduit}${c.marque ? ` | marque:${c.marque}` : ''}${c.categorie ? ` | catégorie:${c.categorie}` : ''}${desc ? ` | ${desc}` : ''}`;
      })
      .join('\n');

    return [
      "Tu es un expert en composants électroniques dans une boutique. Un client cherche une pièce que la boutique n'a peut-être pas exactement ; propose des équivalents fonctionnels parmi le STOCK disponible.",
      '',
      'RÈGLES STRICTES :',
      "1. Ne propose QUE des produits présents dans la liste ci-dessous (utilise leur id exact). N'invente JAMAIS de produit ni d'id.",
      '2. Raisonne sur le rôle/les caractéristiques du composant demandé (type, tension, capacité, puissance, polarité…).',
      "3. Refuse les substituts dangereux ou sous-dimensionnés (ex. tension nominale inférieure). En cas de doute, baisse la compatibilité ou ajoute un avertissement.",
      `4. Maximum ${MAX_SUGGESTIONS} suggestions, des plus pertinentes aux moins pertinentes.`,
      '5. Si aucun équivalent valable : renvoie une liste vide. Ne force pas une réponse.',
      "6. `compatibilite` ∈ {haute, moyenne, faible}. `raison` = 1 phrase technique. `avertissement` seulement si nécessaire.",
      '',
      `COMPOSANT DEMANDÉ : ${query}`,
      '',
      'STOCK DISPONIBLE :',
      liste,
    ].join('\n');
  }

  // ── Cache ───────────────────────────────────────────────────────────────

  private cacheKey(query: string, candidats: CandidatProduit[]): string {
    const ids = candidats.map((c) => c.id).sort().join(',');
    return createHash('md5').update(`${query.toLowerCase()}|${ids}`).digest('hex');
  }

  private fromCache(key: string): any | null {
    const hit = this.cache.get(key);
    if (!hit) return null;
    if (Date.now() - hit.at > CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    return hit.value;
  }

  // ── Point d'entrée ──────────────────────────────────────────────────────

  async suggest(dto: SuggestEquivalenceDto) {
    if (!dto.query && !dto.produitId) {
      throw new BadRequestException('Fournissez une recherche (query) ou un produit (produitId).');
    }

    let candidats: CandidatProduit[];
    let query = (dto.query || '').trim();
    let produitVoulu: string | null = dto.produitId ?? null;

    if (dto.produitId) {
      const { cible, candidats: c } = await this.candidatsParProduit(dto.produitId);
      candidats = c;
      if (!query) {
        query = `${cible.nomProduit}${cible.marque ? ` (${cible.marque})` : ''}`;
      }
    } else {
      candidats = await this.candidatsParTexte(query);
    }

    if (candidats.length === 0) {
      return {
        query,
        suggestions: [],
        message: 'Aucun produit en stock ne correspond pour proposer un équivalent.',
      };
    }

    const key = this.cacheKey(query, candidats);
    const cached = this.fromCache(key);
    if (cached) return cached;

    const prompt = this.buildPrompt(query, candidats);
    const raw = await this.gemini.generateJson(prompt, RESPONSE_SCHEMA);

    // Anti-hallucination : ne garder que les produits réellement présents
    const byId = new Map(candidats.map((c) => [c.id, c]));
    const suggestions = (raw?.suggestions ?? [])
      .filter((s: any) => s && byId.has(s.produitId))
      .slice(0, MAX_SUGGESTIONS)
      .map((s: any) => {
        const p = byId.get(s.produitId)!;
        return {
          produitId: p.id,
          nomProduit: p.nomProduit,
          marque: p.marque,
          quantiteStock: p.quantiteStock,
          prixDetail: p.prixDetail,
          prixPromo: p.prixPromo,
          imageUrl: p.imageUrl,
          raison: String(s.raison || '').slice(0, 300),
          compatibilite: ['haute', 'moyenne', 'faible'].includes(s.compatibilite)
            ? s.compatibilite
            : 'moyenne',
          avertissement: s.avertissement ? String(s.avertissement).slice(0, 300) : null,
        };
      });

    const result = { query, suggestions };

    // Journalisation best-effort
    this.db.suggestionEquivalence
      .create({
        data: {
          query: query.slice(0, 255),
          produitVoulu,
          produitsSuggeres: suggestions,
          vendeurId: dto.vendeurId ?? null,
          source: dto.source ?? 'pos',
        },
      })
      .catch(() => {});

    this.cache.set(key, { at: Date.now(), value: result });
    return result;
  }

  // ── Supervision quota (admin) ───────────────────────────────────────────

  async stats() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [jour, mois] = await Promise.all([
      this.db.suggestionEquivalence.count({ where: { createdAt: { gte: startOfDay } } }),
      this.db.suggestionEquivalence.count({ where: { createdAt: { gte: startOfMonth } } }),
    ]);
    return { configured: this.gemini.isConfigured(), appelsJour: jour, appelsMois: mois };
  }
}
