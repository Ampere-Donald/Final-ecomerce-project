import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from 'src/database/database.service';
import {
  NotificationActor,
  NotificationService,
} from 'src/notification/notification.service';
import { TransfertDto } from 'src/coffre/dto/transfert.dto';
import { CreateCaisseDto } from './dto/create-caisse.dto';
import { UpdateCaisseDto } from './dto/update-caisse.dto';

@Injectable()
export class CaisseService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationService,
  ) {}

  private readonly caisseInclude = { vente: true, achat: true, coffre: true };

  private toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  async calculateSolde(
    coffreId: string | null,
    client: any = this.db,
  ): Promise<number> {
    const operations = await client.caisse.findMany({
      where: { coffreId, annulee: false },
      select: { typeOperation: true, montant: true },
    });

    return operations.reduce((solde, op) => {
      const montant = this.toNumber(op.montant);
      return op.typeOperation === 'ENTREE' ? solde + montant : solde - montant;
    }, 0);
  }

  async create(createCaisseDto: CreateCaisseDto, actor?: NotificationActor) {
    const caisse = await this.db.caisse.create({
      data: {
        ...createCaisseDto,
        effectueePar: actor?.id,
      },
      include: this.caisseInclude,
    });
    this.notifications
      .create(
        'CAISSE_CREEE',
        `Operation caisse ${caisse.typeOperation} - ${caisse.montant} FCFA`,
        actor,
      )
      .catch(() => {});
    return caisse;
  }

  async findAll() {
    return await this.db.caisse.findMany({
      include: this.caisseInclude,
      orderBy: { dateOperation: 'desc' },
    });
  }

  async findOne(id: string) {
    const caisse = await this.db.caisse.findUnique({
      where: { id },
      include: this.caisseInclude,
    });
    if (!caisse) {
      throw new NotFoundException(
        `Operation caisse avec l'id ${id} non trouvee`,
      );
    }
    return caisse;
  }

  async update(
    id: string,
    updateCaisseDto: UpdateCaisseDto,
    actor?: NotificationActor,
  ) {
    void id;
    void updateCaisseDto;
    void actor;
    throw new BadRequestException(
      'Les ecritures de caisse sont immuables. Annulez une ecriture au lieu de la modifier.',
    );
  }

  async remove(id: string, actor?: NotificationActor) {
    void id;
    void actor;
    throw new BadRequestException(
      'Les ecritures de caisse sont immuables. Annulez une ecriture au lieu de la supprimer.',
    );
  }

  async getSolde() {
    const solde = await this.calculateSolde(null);
    return { solde };
  }

  async transferer(dto: TransfertDto, actor?: NotificationActor) {
    const montant = this.toNumber(dto.montant);
    if (montant <= 0) {
      throw new BadRequestException('Le montant du transfert doit etre positif.');
    }

    const coffre = await this.db.coffre.findUnique({
      where: { id: dto.coffreId },
    });
    if (!coffre) {
      throw new NotFoundException(`Coffre avec l'id ${dto.coffreId} non trouve`);
    }
    if (coffre.statut !== 'ACTIF') {
      throw new BadRequestException('Seul un coffre actif peut etre alimente.');
    }

    const details = dto.motif?.trim();
    const transfertGroupId = randomUUID();

    const result = await this.db.$transaction(async (tx: any) => {
      const soldeCaisse = await this.calculateSolde(null, tx);
      if (soldeCaisse < montant) {
        throw new BadRequestException(
          'Solde caisse insuffisant pour effectuer ce transfert.',
        );
      }

      const sortie = await tx.caisse.create({
        data: {
          coffreId: null,
          typeOperation: 'SORTIE',
          montant,
          motif: details
            ? `Transfert vers coffre ${coffre.nom} - ${details}`
            : `Transfert vers coffre ${coffre.nom}`,
          transfertGroupId,
          effectueePar: actor?.id,
        },
        include: this.caisseInclude,
      });

      const entree = await tx.caisse.create({
        data: {
          coffreId: coffre.id,
          typeOperation: 'ENTREE',
          montant,
          motif: details
            ? `Transfert depuis caisse - ${details}`
            : 'Transfert depuis caisse',
          transfertGroupId,
          effectueePar: actor?.id,
        },
        include: this.caisseInclude,
      });

      const soldeCoffre = await this.calculateSolde(coffre.id, tx);
      const objectif = this.toNumber(coffre.objectifMontant);
      if (objectif > 0 && soldeCoffre >= objectif) {
        await tx.coffre.update({
          where: { id: coffre.id },
          data: { statut: 'ATTEINT' },
        });
      }

      return { operations: [sortie, entree], soldeCoffre };
    });

    this.notifications
      .create(
        'CAISSE_CREEE',
        `Transfert caisse vers coffre ${coffre.nom} - ${montant} FCFA`,
        actor,
      )
      .catch(() => {});
    return result;
  }

  async annuler(
    id: string,
    motifAnnulation: string,
    actor?: NotificationActor,
  ) {
    const motif = motifAnnulation?.trim();
    if (!motif) {
      throw new BadRequestException("Le motif d'annulation est obligatoire.");
    }

    const operation = await this.findOne(id);
    if (operation.annulee) {
      throw new BadRequestException('Cette ecriture est deja annulee.');
    }

    const result = await this.db.$transaction(async (tx: any) => {
      const operations = operation.transfertGroupId
        ? await tx.caisse.findMany({
            where: { transfertGroupId: operation.transfertGroupId },
            include: this.caisseInclude,
          })
        : [operation];

      const ids = operations.map((op) => op.id);
      await tx.caisse.updateMany({
        where: { id: { in: ids }, annulee: false },
        data: {
          annulee: true,
          motifAnnulation: motif,
          annuleeById: actor?.id,
          annuleeAt: new Date(),
          version: { increment: 1 },
        },
      });

      return tx.caisse.findMany({
        where: { id: { in: ids } },
        include: this.caisseInclude,
        orderBy: { dateOperation: 'desc' },
      });
    });

    this.notifications
      .create('CAISSE_MAJ', `Operation caisse annulee - ${motif}`, actor)
      .catch(() => {});

    return { annulees: result };
  }

  async getSoldeGlobal() {
    const caissePrincipale = await this.calculateSolde(null);
    const coffres = await this.db.coffre.findMany({
      where: { statut: { not: 'CLOTURE' } },
      orderBy: { createdAt: 'desc' },
    });

    const coffresWithSolde = await Promise.all(
      coffres.map(async (coffre) => {
        const solde = await this.calculateSolde(coffre.id);
        return {
          id: coffre.id,
          nom: coffre.nom,
          solde,
          objectifMontant:
            coffre.objectifMontant === null
              ? null
              : this.toNumber(coffre.objectifMontant),
          dateEcheance: coffre.dateEcheance,
          statut: coffre.statut,
        };
      }),
    );

    const total =
      caissePrincipale +
      coffresWithSolde.reduce((sum, coffre) => sum + coffre.solde, 0);
    return { caissePrincipale, coffres: coffresWithSolde, total };
  }
}
