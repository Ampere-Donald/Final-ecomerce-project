import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { DatabaseService } from 'src/database/database.service';
import { GeminiClient } from './gemini.client';
import { SuggestEquivalenceDto } from './dto/suggest-equivalence.dto';
import {
  EQUIVALENCE_COMPONENT_CATEGORY,
  EQUIVALENCE_INELIGIBLE_MESSAGE,
  EQUIVALENCE_NO_CANDIDATE_MESSAGE,
  isProductEligibleForEquivalence,
  looksLikeElectronicComponentQuery,
  normalizeEligibilityText,
} from './equivalence-eligibility';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CANDIDATS = 300;
const MAX_SUGGESTIONS = 5;

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
  codeFamille: string | null;
  code: string | null;
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

  private async candidatsParProduit(produitId: string): Promise<{
    cible: any;
    candidats: CandidatProduit[];
    eligible: boolean;
  }> {
    const cible = await this.db.produit.findUnique({
      where: { id: produitId },
      include: { categorie: { select: { nom: true } } },
    });
    if (!cible) throw new BadRequestException('Produit cible introuvable.');
    if (!isProductEligibleForEquivalence(cible)) {
      return { cible, candidats: [], eligible: false };
    }

    const produits = await this.db.produit.findMany({
      where: {
        categorieId: cible.categorieId,
        categorie: {
          is: { nom: { equals: EQUIVALENCE_COMPONENT_CATEGORY, mode: 'insensitive' } },
        },
        quantiteStock: { gt: 0 },
        id: { not: produitId },
      },
      include: { categorie: { select: { nom: true } } },
      take: MAX_CANDIDATS,
    });

    return {
      cible,
      candidats: produits
        .filter((p) => isProductEligibleForEquivalence(p))
        .map((p) => this.mapCandidat(p)),
      eligible: true,
    };
  }

  private async candidatsParTexte(query: string): Promise<CandidatProduit[]> {
    const q = query.trim();
    const firstWord = q.split(/\s+/)[0] || q;
    const insensitive = 'insensitive' as const;

    const produits = await this.db.produit.findMany({
      where: {
        quantiteStock: { gt: 0 },
        categorie: {
          is: { nom: { equals: EQUIVALENCE_COMPONENT_CATEGORY, mode: insensitive } },
        },
        OR: [
          { nomProduit: { contains: firstWord, mode: insensitive } },
          { marque: { contains: firstWord, mode: insensitive } },
          { description: { contains: q, mode: insensitive } },
          { codeFamille: { contains: q, mode: insensitive } },
          { code: { contains: q, mode: insensitive } },
          { categorie: { is: { nom: { contains: firstWord, mode: insensitive } } } },
        ],
      },
      include: { categorie: { select: { nom: true } } },
      take: MAX_CANDIDATS,
    });

    return produits.map((p) => this.mapCandidat(p));
  }

  private buildLocalSuggestions(query: string, candidats: CandidatProduit[]) {
    const tokens = normalizeEligibilityText(query)
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 2);

    return candidats
      .map((p) => {
        const searchable = normalizeEligibilityText(
          [
            p.nomProduit,
            p.marque,
            p.categorie,
            p.description,
            p.codeFamille,
            p.code,
          ]
            .filter(Boolean)
            .join(' '),
        );
        const score = tokens.reduce(
          (sum, token) => sum + (searchable.includes(token) ? 1 : 0),
          0,
        );
        return { p, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || b.p.quantiteStock - a.p.quantiteStock)
      .slice(0, MAX_SUGGESTIONS)
      .map(({ p }) => ({
        produitId: p.id,
        nomProduit: p.nomProduit,
        marque: p.marque,
        codeFamille: p.codeFamille,
        code: p.code,
        quantiteStock: p.quantiteStock,
        prixDetail: p.prixDetail,
        prixPromo: p.prixPromo,
        imageUrl: p.imageUrl,
        raison: 'Suggestion catalogue basée sur les correspondances produit en stock.',
        compatibilite: 'moyenne',
        avertissement: 'Vérifier les caractéristiques techniques avant substitution.',
      }));
  }

  private mapCandidat(p: any): CandidatProduit {
    return {
      id: p.id,
      nomProduit: p.nomProduit,
      marque: p.marque ?? null,
      description: p.description ?? null,
      categorie: p.categorie?.nom ?? null,
      codeFamille: p.codeFamille ?? null,
      code: p.code ?? null,
      quantiteStock: p.quantiteStock,
      prixDetail: p.prixDetail ?? null,
      prixPromo: p.prixPromo ?? null,
      imageUrl: p.imageUrl ?? null,
    };
  }

  private buildPrompt(query: string, candidats: CandidatProduit[]): string {
    const liste = candidats
      .map((c) => {
        const desc = (c.description || '').slice(0, 160).replace(/\s+/g, ' ');
        const ref = c.codeFamille && c.code ? ` | ref:${c.codeFamille}/${c.code}` : '';
        return `- id:${c.id} | ${c.nomProduit}${ref}${c.marque ? ` | marque:${c.marque}` : ''}${c.categorie ? ` | categorie:${c.categorie}` : ''} | stock:${c.quantiteStock}${desc ? ` | ${desc}` : ''}`;
      })
      .join('\n');

    return [
      "Tu es un expert en composants et pieces electroniques pour la branche X-electronic de NEWOTEG. Un client cherche une piece que la boutique n'a peut-etre pas exactement ; propose des equivalents fonctionnels parmi le STOCK disponible.",
      '',
      'REGLES STRICTES :',
      "1. Ne propose QUE des produits presents dans la liste ci-dessous (utilise leur id exact). N'invente JAMAIS de produit ni d'id.",
      '2. Raisonne sur le role et les caracteristiques du composant demande (type, tension, capacite, puissance, polarite...).',
      '3. Refuse les substituts dangereux ou sous-dimensionnes. En cas de doute, baisse la compatibilite ou ajoute un avertissement.',
      `4. Maximum ${MAX_SUGGESTIONS} suggestions, des plus pertinentes aux moins pertinentes.`,
      '5. Si aucun equivalent valable: renvoie une liste vide. Ne force pas une reponse.',
      '6. compatibilite doit etre haute, moyenne ou faible. raison = 1 phrase technique.',
      '',
      `COMPOSANT DEMANDE : ${query}`,
      '',
      'CATALOGUE X-electronic EN STOCK :',
      liste,
    ].join('\n');
  }

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

  async suggest(dto: SuggestEquivalenceDto) {
    if (!dto.query && !dto.produitId) {
      throw new BadRequestException('Fournissez une recherche (query) ou un produit (produitId).');
    }

    let candidats: CandidatProduit[];
    let query = (dto.query || '').trim();
    let produitVoulu: string | null = dto.produitId ?? null;

    if (dto.produitId) {
      const { cible, candidats: c, eligible } = await this.candidatsParProduit(dto.produitId);
      if (!eligible) {
        return { query, suggestions: [], message: EQUIVALENCE_INELIGIBLE_MESSAGE };
      }
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
        message: looksLikeElectronicComponentQuery(query)
          ? EQUIVALENCE_NO_CANDIDATE_MESSAGE
          : EQUIVALENCE_INELIGIBLE_MESSAGE,
      };
    }

    const key = this.cacheKey(query, candidats);
    const cached = this.fromCache(key);
    if (cached) return cached;

    const prompt = this.buildPrompt(query, candidats);
    let raw: any;
    try {
      raw = await this.gemini.generateJson(prompt, RESPONSE_SCHEMA);
    } catch (error: any) {
      this.logger.warn(`Gemini unavailable, using local catalogue fallback: ${error?.message}`);
      const suggestions = this.buildLocalSuggestions(query, candidats);
      const result = {
        query,
        suggestions,
        message: suggestions.length
          ? 'Suggestions catalogue générées sans IA distante.'
          : EQUIVALENCE_NO_CANDIDATE_MESSAGE,
      };

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
        .catch((logError) =>
          this.logger.debug(`Suggestion log skipped: ${logError?.message}`),
        );

      this.cache.set(key, { at: Date.now(), value: result });
      return result;
    }

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
          codeFamille: p.codeFamille,
          code: p.code,
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

    const result = {
      query,
      suggestions,
      message: suggestions.length ? undefined : EQUIVALENCE_NO_CANDIDATE_MESSAGE,
    };

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
      .catch((error) => this.logger.debug(`Suggestion log skipped: ${error?.message}`));

    this.cache.set(key, { at: Date.now(), value: result });
    return result;
  }

  async stats() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [jour, mois] = await Promise.all([
      this.db.suggestionEquivalence.count({ where: { createdAt: { gte: startOfDay } } }),
      this.db.suggestionEquivalence.count({ where: { createdAt: { gte: startOfMonth } } }),
    ]);

    return {
      configured: this.gemini.isConfigured(),
      model: this.gemini.getModel(),
      appelsJour: jour,
      appelsMois: mois,
    };
  }

  health() {
    return this.gemini.health();
  }
}
