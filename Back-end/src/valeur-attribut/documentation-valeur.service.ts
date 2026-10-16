import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import {
  DocumentationValeurDto,
  RelireDocumentationDto,
} from './dto/documentation-valeur.dto';
import { documentationData, publicDocumentation } from './documentation-data';

@Injectable()
export class DocumentationValeurService {
  constructor(private readonly db: DatabaseService) {}

  async read(id: string, admin = false) {
    const value = await this.db.valeurAttribut.findUnique({
      where: { id },
      include: {
        attribut: { include: { produit: { select: { version: true } } } },
        documentation: true,
      },
    });
    if (!value) throw new NotFoundException('Valeur attribut introuvable.');
    if (!admin)
      return publicDocumentation(
        value,
        value.attribut.version,
        value.attribut.produit.version,
      );
    return {
      valeur: value.valeur,
      valeurVersion: value.version,
      attributVersion: value.attribut.version,
      produitVersion: value.attribut.produit.version,
      attribut: value.attribut.nomAttribut,
      documentation: value.documentation,
      effective: publicDocumentation(
        value,
        value.attribut.version,
        value.attribut.produit.version,
      ),
    };
  }

  async write(
    id: string,
    input: DocumentationValeurDto,
    actorId: string,
    review = false,
  ) {
    if (
      !actorId ||
      (review && (input as RelireDocumentationDto).confirmerRelecture !== true)
    )
      throw new BadRequestException(
        'Confirmez la relecture des sources et de cette valeur.',
      );
    const data = documentationData(input, review);
    return this.db.$transaction(async (tx) => {
      // Serialize annotation against value and attribute edits. The context
      // version check also protects reads after later legacy CRUD changes.
      await tx.$queryRaw`SELECT v.id FROM valeur_attribut v JOIN attribut a ON a.id=v.id_attribut JOIN produit p ON p.id=a.id_produit WHERE v.id=${id} FOR UPDATE OF v, a, p`;
      const value = await tx.valeurAttribut.findUnique({
        where: { id },
        include: {
          attribut: { include: { produit: { select: { version: true } } } },
          documentation: true,
        },
      });
      if (!value) throw new NotFoundException('Valeur attribut introuvable.');
      if (
        input.valeurVersion !== value.version ||
        input.attributVersion !== value.attribut.version ||
        input.produitVersion !== value.attribut.produit.version ||
        input.version !== (value.documentation?.version ?? 0)
      )
        throw new ConflictException(
          'La valeur ou sa documentation a changé. Rechargez avant de relire.',
        );
      const annotation = {
        ...data,
        etat: review ? ('DOCUMENTE' as const) : input.etat,
        valeurVersion: value.version,
        attributVersion: value.attribut.version,
        produitVersion: value.attribut.produit.version,
        valeurSource: value.valeur,
        reluParId: review ? actorId : null,
        reluLe: review ? new Date() : null,
      };
      const documentation = await tx.documentationValeur.upsert({
        where: { valeurId: id },
        create: { valeurId: id, ...annotation },
        update: { ...annotation, version: { increment: 1 } },
      });
      return {
        ...documentation,
        effective: publicDocumentation(
          { ...value, documentation },
          value.attribut.version,
          value.attribut.produit.version,
        ),
      };
    });
  }
}
