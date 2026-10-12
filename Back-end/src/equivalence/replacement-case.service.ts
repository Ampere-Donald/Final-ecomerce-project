import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { publicDocumentation } from '../valeur-attribut/documentation-data';
import { publicCatalogue } from '../produit/public-catalogue';
import { isProductEligibleForEquivalence } from './equivalence-eligibility';
import {
  EvaluateReplacementDto,
  ReplacementCaseDto,
  ReviewReplacementDto,
} from './dto/replacement-case.dto';
import {
  caseKey,
  fingerprint,
  replacementData,
  scopeApplication,
} from './replacement-case-data';

@Injectable()
export class ReplacementCaseService {
  constructor(private readonly db: DatabaseService) {}

  async evidence(id: string, after?: string) {
    return this.db.$transaction(
      async (tx) => {
        const produit = await tx.produit.findUnique({
          where: { id },
          select: {
            id: true,
            version: true,
            nomProduit: true,
            code: true,
            estActif: true,
          },
        });
        if (!produit) throw new NotFoundException('Pièce introuvable.');
        const rows = await tx.valeurAttribut.findMany({
          where: {
            attribut: { produitId: id },
            ...(after ? { id: { gt: after } } : {}),
          },
          orderBy: { id: 'asc' },
          take: 101,
          include: {
            documentation: true,
            attribut: {
              select: {
                id: true,
                version: true,
                produitId: true,
                nomAttribut: true,
                cleTechnique: true,
              },
            },
          },
        });
        const page = rows.slice(0, 100);
        return {
          produit,
          valeurs: page.map((v) => ({
            id: v.id,
            attribut: v.attribut,
            valeur: v.valeur,
            documentation: publicDocumentation(
              v,
              v.attribut.version,
              produit.version,
            ),
          })),
          next: rows.length > 100 ? page[page.length - 1].id : null,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  // Bounded, selected evidence: every chosen value must belong to the described
  // pair and carry a current review. The human still decides sufficiency.
  private async context(tx: Prisma.TransactionClient, cas: any) {
    const ids = [cas.candidatId, cas.cibleId].filter(Boolean).sort();
    const products = await tx.produit.findMany({
      where: { id: { in: ids } },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        version: true,
        nomProduit: true,
        marque: true,
        code: true,
        codeFamille: true,
        estActif: true,
        categorie: { select: { id: true, nom: true, version: true } },
      },
    });
    const raw = await tx.valeurAttribut.findMany({
      where: { id: { in: cas.valeurIds } },
      orderBy: { id: 'asc' },
      include: {
        documentation: true,
        attribut: {
          select: {
            id: true,
            produitId: true,
            version: true,
            nomAttribut: true,
            cleTechnique: true,
          },
        },
      },
    });
    const byProduct = new Map(products.map((p) => [p.id, p]));
    const values = raw.map((v) => ({
      id: v.id,
      version: v.version,
      attribut: v.attribut,
      valeur: v.valeur,
      documentationVersion: v.documentation?.version ?? null,
      documentation: publicDocumentation(
        v,
        v.attribut.version,
        byProduct.get(v.attribut.produitId)?.version,
      ),
    }));
    const complete =
      products.length === ids.length &&
      products.every((p) => p.estActif && isProductEligibleForEquivalence(p)) &&
      raw.length === cas.valeurIds.length &&
      values.every((v) => {
        const source = v.documentation as Record<string, unknown>;
        if (
          !byProduct.has(v.attribut.produitId) ||
          !v.valeur.trim() ||
          source.etat !== 'DOCUMENTE' ||
          typeof source.sourceUrl !== 'string' ||
          typeof source.sourceDocument !== 'string' ||
          !source.sourceDocument.trim() ||
          typeof source.sourceRepere !== 'string' ||
          !source.sourceRepere.trim()
        )
          return false;
        try {
          const url = new URL(source.sourceUrl);
          return url.protocol === 'https:' && !url.username && !url.password;
        } catch {
          return false;
        }
      }) &&
      ids.every((id) => values.some((v) => v.attribut.produitId === id));
    // Source URL/document/page for the requested marking is distinct from the
    // candidate's selected technical values. No fetching or fabricated source.
    const description = Object.fromEntries(
      [
        'reference',
        'referenceCle',
        'cibleId',
        'candidatId',
        'application',
        'verdict',
        'justification',
        'limites',
        'adaptations',
        'sourceUrl',
        'sourceDocument',
        'sourceRepere',
        'sourceRevision',
        'valeurIds',
      ].map((key) => [key, cas[key] ?? null]),
    );
    const preuve = JSON.parse(
      JSON.stringify({ cas: description, products, values }),
    );
    return { complete, preuve, empreinte: fingerprint(preuve) };
  }

  private effective(
    cas: any,
    context: { complete: boolean; empreinte: string },
  ) {
    return (
      !cas.retire &&
      context.complete &&
      cas.reluVersion === cas.version &&
      !!cas.reluParId &&
      !!cas.reluLe &&
      cas.empreinteRelue === context.empreinte
    );
  }

  async read(id: string) {
    return this.db.$transaction(
      async (tx) => {
        const cas = await tx.casRemplacement.findUnique({
          where: { id },
          include: { historique: { orderBy: { reluLe: 'desc' }, take: 20 } },
        });
        if (!cas)
          throw new NotFoundException('Cas de remplacement introuvable.');
        const context = await this.context(tx, cas);
        return {
          ...cas,
          empreinteCourante: context.empreinte,
          preuvesActuelles: context.preuve,
          sourcesSelectionRelues: context.complete,
          reluActuel: this.effective(cas, context),
          obsolete: !!cas.reluLe && !this.effective(cas, context),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async list(candidatId?: string) {
    return this.db.casRemplacement.findMany({
      where: candidatId ? { candidatId } : {},
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      take: 50,
      select: {
        id: true,
        version: true,
        reference: true,
        application: true,
        candidatId: true,
        cibleId: true,
        verdict: true,
        retire: true,
        reluVersion: true,
        reluLe: true,
      },
    });
  }

  async write(id: string | null, input: ReplacementCaseDto) {
    const data = replacementData(input);
    try {
      return await this.db.$transaction(async (tx) => {
        if (id)
          await tx.$queryRaw`SELECT id FROM cas_remplacement WHERE id=${id} FOR UPDATE`;
        const current = id
          ? await tx.casRemplacement.findUnique({ where: { id } })
          : null;
        if (id && !current)
          throw new NotFoundException('Cas de remplacement introuvable.');
        if (input.version !== (current?.version ?? 0))
          throw new ConflictException(
            'Ce cas a changé. Rechargez avant de modifier.',
          );
        const context = await this.context(tx, data);
        // Drafts may retain incomplete sources, but cannot point at a missing
        // article or import the evidence of an unrelated product.
        if (context.preuve.products.length !== (data.cibleId ? 2 : 1))
          throw new BadRequestException('Pièce cible ou proposée introuvable.');
        if (
          context.preuve.values.length !== data.valeurIds.length ||
          context.preuve.values.some(
            (v: any) =>
              ![data.cibleId, data.candidatId].includes(v.attribut.produitId),
          )
        )
          throw new BadRequestException(
            'Les valeurs choisies doivent appartenir aux pièces de ce cas.',
          );
        const cas = id
          ? await tx.casRemplacement.update({
              where: { id },
              data: { ...data, version: { increment: 1 } },
            })
          : await tx.casRemplacement.create({ data });
        return { ...cas, reluActuel: false };
      });
    } catch (error) {
      if (error?.code === 'P2002')
        throw new ConflictException(
          'Un cas existe déjà pour cette référence, cette pièce et cet usage.',
        );
      throw error;
    }
  }

  async review(id: string, input: ReviewReplacementDto, actorId: string) {
    if (!actorId || input.confirmerRelecture !== true)
      throw new BadRequestException(
        'Confirmez la relecture du cas et de toutes ses sources.',
      );
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM cas_remplacement WHERE id=${id} FOR UPDATE`;
      const cas = await tx.casRemplacement.findUnique({ where: { id } });
      if (!cas) throw new NotFoundException('Cas de remplacement introuvable.');
      if (cas.version !== input.version || cas.retire)
        throw new ConflictException(
          'Ce cas a changé ou a été retiré. Rechargez avant de relire.',
        );
      const context = await this.context(tx, cas);
      if (context.empreinte !== input.empreinte)
        throw new ConflictException(
          'Les sources ont changé. Rechargez et vérifiez à nouveau ce cas.',
        );
      if (!context.complete)
        throw new BadRequestException(
          'Chaque pièce doit disposer des valeurs choisies et de sources relues actuelles dans la famille autorisée.',
        );
      if (this.effective(cas, context))
        throw new ConflictException('Ce cas est déjà relu dans cette version.');
      const reluLe = new Date(),
        version = cas.version + 1;
      await tx.relectureRemplacement.create({
        data: {
          casId: id,
          casVersion: version,
          reluParId: actorId,
          reluLe,
          empreinte: context.empreinte,
          preuve: context.preuve,
        },
      });
      const result = await tx.casRemplacement.update({
        where: { id },
        data: {
          version,
          reluVersion: version,
          reluParId: actorId,
          reluLe,
          empreinteRelue: context.empreinte,
        },
      });
      return { ...result, reluActuel: true };
    });
  }

  // Independent of the model/cache: re-evaluate source freshness on every call.
  // No fuzzy reference or application match and no private draft/history leaks.
  async evaluate(input: EvaluateReplacementDto) {
    const application = scopeApplication(input.application || '');
    if (!input.query?.trim() && !input.produitId)
      throw new BadRequestException(
        'Indiquez une référence exacte ou une pièce cible.',
      );
    if (!input.candidatIds.length) return [];
    const availability = await publicCatalogue(
      this.db,
      { limit: 5, inStock: true },
      new Date(),
      input.candidatIds,
    );
    const available = new Set(availability.data.map((p) => p.id));
    return this.db.$transaction(
      async (tx) => {
        const keys = input.candidatIds.map((id) =>
          caseKey(input.query || '', input.produitId || null, id, application),
        );
        const cases = application
          ? await tx.casRemplacement.findMany({
              where: { cleCas: { in: keys }, retire: false },
              take: 5,
            })
          : [];
        const byKey = new Map(cases.map((cas) => [cas.cleCas, cas]));
        return Promise.all(
          input.candidatIds.map(async (produitId, i) => {
            const cas = byKey.get(keys[i]);
            if (!cas || !available.has(produitId))
              return { produitId, decision: null };
            const context = await this.context(tx, cas);
            if (!this.effective(cas, context))
              return { produitId, decision: null };
            return {
              produitId,
              decision: {
                verdict: cas.verdict,
                reference: cas.reference,
                application: cas.application,
                justification: cas.justification,
                limites: cas.limites,
                adaptations: cas.adaptations,
                reluLe: cas.reluLe,
                source: {
                  url: cas.sourceUrl,
                  document: cas.sourceDocument,
                  repere: cas.sourceRepere,
                  revision: cas.sourceRevision,
                },
              },
            };
          }),
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}
