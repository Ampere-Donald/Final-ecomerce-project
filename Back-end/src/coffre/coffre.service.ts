import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CaisseService } from 'src/caisse/caisse.service';
import {
  NotificationActor,
  NotificationService,
} from 'src/notification/notification.service';
import { CreateCoffreDto } from './dto/create-coffre.dto';
import { SortieCoffreDto } from './dto/sortie-coffre.dto';
import { UpdateCoffreDto } from './dto/update-coffre.dto';

@Injectable()
export class CoffreService {
  constructor(
    private readonly db: DatabaseService,
    private readonly caisseService: CaisseService,
    private readonly notifications: NotificationService,
  ) {}

  private readonly operationInclude = {
    vente: true,
    achat: true,
    coffre: true,
  };

  private toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private withComputedFields(coffre: any, soldeActuel: number) {
    const objectifMontant =
      coffre.objectifMontant === null
        ? null
        : this.toNumber(coffre.objectifMontant);
    const progression =
      objectifMontant && objectifMontant > 0
        ? Math.min(100, Math.round((soldeActuel / objectifMontant) * 100))
        : null;

    return {
      ...coffre,
      objectifMontant,
      soldeActuel,
      progression,
    };
  }

  async create(dto: CreateCoffreDto, actor?: NotificationActor) {
    const coffre = await this.db.coffre.create({
      data: {
        nom: dto.nom,
        description: dto.description,
        objectifMontant: dto.objectifMontant,
        dateEcheance: dto.dateEcheance ? new Date(dto.dateEcheance) : undefined,
        createdById: actor?.id,
      },
    });

    this.notifications
      .create('CAISSE_CREEE', `Coffre "${coffre.nom}" cree`, actor)
      .catch(() => {});

    return this.withComputedFields(coffre, 0);
  }

  async findAll() {
    const coffres = await this.db.coffre.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      coffres.map(async (coffre) =>
        this.withComputedFields(
          coffre,
          await this.caisseService.calculateSolde(coffre.id),
        ),
      ),
    );
  }

  async findOne(id: string) {
    const coffre = await this.db.coffre.findUnique({
      where: { id },
      include: {
        operations: {
          include: this.operationInclude,
          orderBy: { dateOperation: 'desc' },
        },
      },
    });

    if (!coffre) {
      throw new NotFoundException(`Coffre avec l'id ${id} non trouve`);
    }

    const soldeActuel = await this.caisseService.calculateSolde(id);
    return this.withComputedFields(coffre, soldeActuel);
  }

  async update(id: string, dto: UpdateCoffreDto, actor?: NotificationActor) {
    await this.findOne(id);
    const coffre = await this.db.coffre.update({
      where: { id },
      data: {
        nom: dto.nom,
        description: dto.description,
        objectifMontant: dto.objectifMontant,
        dateEcheance: dto.dateEcheance ? new Date(dto.dateEcheance) : undefined,
      },
    });

    this.notifications
      .create('CAISSE_MAJ', `Coffre "${coffre.nom}" modifie`, actor)
      .catch(() => {});

    return this.withComputedFields(
      coffre,
      await this.caisseService.calculateSolde(id),
    );
  }

  async sortie(id: string, dto: SortieCoffreDto, actor?: NotificationActor) {
    const coffre = await this.db.coffre.findUnique({ where: { id } });
    if (!coffre) {
      throw new NotFoundException(`Coffre avec l'id ${id} non trouve`);
    }
    if (!['ACTIF', 'ATTEINT'].includes(coffre.statut)) {
      throw new BadRequestException('Ce coffre ne peut plus effectuer de sortie.');
    }

    const montant = this.toNumber(dto.montant);
    const solde = await this.caisseService.calculateSolde(id);
    if (solde < montant) {
      throw new BadRequestException('Solde coffre insuffisant pour effectuer cette sortie.');
    }

    const motif = dto.beneficiaire
      ? `${dto.motif} - Beneficiaire: ${dto.beneficiaire}`
      : dto.motif;

    const operation = await this.db.caisse.create({
      data: {
        coffreId: id,
        typeOperation: 'SORTIE',
        montant,
        motif,
        effectueePar: actor?.id,
      },
      include: this.operationInclude,
    });

    this.notifications
      .create('CAISSE_CREEE', `Sortie coffre ${coffre.nom} - ${montant} FCFA`, actor)
      .catch(() => {});

    return {
      operation,
      soldeCoffre: await this.caisseService.calculateSolde(id),
    };
  }

  async cloturer(id: string, force = false, actor?: NotificationActor) {
    const coffre = await this.db.coffre.findUnique({ where: { id } });
    if (!coffre) {
      throw new NotFoundException(`Coffre avec l'id ${id} non trouve`);
    }
    if (coffre.statut === 'CLOTURE') {
      throw new BadRequestException('Ce coffre est deja cloture.');
    }

    const solde = await this.caisseService.calculateSolde(id);
    if (solde !== 0) {
      throw new BadRequestException('Videz le coffre avant cloture (transfert ou sortie).');
    }

    const warnings: string[] = [];
    if (coffre.objectifMontant !== null && coffre.statut !== 'ATTEINT') {
      warnings.push("l'objectif du coffre n'a jamais ete atteint");
    }
    if (coffre.dateEcheance && coffre.dateEcheance.getTime() > Date.now()) {
      warnings.push("la date d'echeance est encore dans le futur");
    }
    if (warnings.length > 0 && !force) {
      throw new ConflictException({
        warning: `Cloture a confirmer: ${warnings.join(', ')}.`,
        requireForce: true,
      });
    }

    const updated = await this.db.coffre.update({
      where: { id },
      data: { statut: 'CLOTURE' },
    });

    this.notifications
      .create('CAISSE_MAJ', `Coffre "${updated.nom}" cloture`, actor)
      .catch(() => {});

    return this.withComputedFields(updated, 0);
  }
}
