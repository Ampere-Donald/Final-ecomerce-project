import { Injectable, NotFoundException } from '@nestjs/common';
import { TypeFacture } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';

type FactureFilters = {
  type?: TypeFacture;
  vendeurId?: string;
  periode?: string;
};

@Injectable()
export class FactureService {
  constructor(private readonly db: DatabaseService) {}

  findAll(filters: FactureFilters) {
    const where: any = {};

    if (filters.type) where.type = filters.type;
    if (filters.vendeurId) where.vendeurId = filters.vendeurId;
    if (filters.periode) {
      const [year, month] = filters.periode.split('-').map(Number);
      if (year && month) {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 1);
        where.dateEmission = { gte: start, lt: end };
      }
    }

    return this.db.facture.findMany({
      where,
      include: this.defaultInclude(),
      orderBy: { dateEmission: 'desc' },
    });
  }

  async findOne(id: string) {
    const facture = await this.db.facture.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });
    if (!facture) throw new NotFoundException('Facture introuvable');
    return facture;
  }

  async incrementPrintCount(id: string) {
    const facture = await this.db.facture.update({
      where: { id },
      data: { printCount: { increment: 1 } },
      select: { printCount: true },
    });
    return facture;
  }

  private defaultInclude() {
    return {
      vendeur: { select: { id: true, nom: true, email: true, role: true } },
      caissier: { select: { id: true, nom: true, email: true, role: true } },
      client: true,
      lignes: true,
      bon: true,
      vente: true,
    };
  }
}
