import { Injectable, NotFoundException } from '@nestjs/common';
import { TypeFacture } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { RecordPrintDto } from './dto/record-print.dto';

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
    const facture = await this.findOne(id);
    return this.recordPrint({
      documentType: facture.type === 'FACTURE' ? 'FACTURE' : facture.type === 'BON_VENTE' ? 'BON_VENTE' : 'TICKET',
      documentId: facture.id,
      documentNumber: facture.numero,
      status: 'SUCCESS',
      workstationId: 'legacy-client',
    }, facture.caissierId || facture.vendeurId);
  }

  async recordPrint(dto: RecordPrintDto, actorId: string) {
    return this.db.$transaction(async (tx) => {
      const previousSuccesses = await tx.printEvent.count({
        where: {
          documentType: dto.documentType,
          documentNumber: dto.documentNumber,
          status: 'SUCCESS',
        },
      });
      let mode = previousSuccesses === 0 ? 'ORIGINAL' : 'DUPLICATA';
      let printCount = previousSuccesses;

      if (dto.status === 'SUCCESS') {
        printCount += 1;
        if (dto.documentId && ['TICKET', 'FACTURE', 'BON_VENTE'].includes(dto.documentType)) {
          const updated = await tx.facture.update({
            where: { id: dto.documentId },
            data: { printCount: { increment: 1 } },
            select: { printCount: true },
          });
          printCount = updated.printCount;
          mode = printCount === 1 ? 'ORIGINAL' : 'DUPLICATA';
        } else if (dto.documentId && dto.documentType === 'PROFORMA') {
          const updated = await tx.proforma.update({
            where: { id: dto.documentId },
            data: { printCount: { increment: 1 } },
            select: { printCount: true },
          });
          printCount = updated.printCount;
          mode = printCount === 1 ? 'ORIGINAL' : 'DUPLICATA';
        } else if (dto.documentId && dto.documentType === 'FACTURE_VIRTUELLE') {
          const updated = await tx.factureVirtuelle.update({
            where: { id: dto.documentId },
            data: { printCount: { increment: 1 } },
            select: { printCount: true },
          });
          printCount = updated.printCount;
          mode = printCount === 1 ? 'ORIGINAL' : 'DUPLICATA';
        }
      }

      const event = await tx.printEvent.create({
        data: {
          documentType: dto.documentType,
          documentId: dto.documentId,
          documentNumber: dto.documentNumber,
          mode,
          status: dto.status,
          workstationId: dto.workstationId,
          printerName: dto.printerName,
          actorId,
          errorCode: dto.errorCode,
        },
      });
      return { event, printCount, mode };
    });
  }

  listPrintEvents(documentType?: string, documentNumber?: string) {
    return this.db.printEvent.findMany({
      where: {
        ...(documentType ? { documentType } : {}),
        ...(documentNumber ? { documentNumber } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        actor: { select: { id: true, nom: true, username: true, role: true } },
      },
    });
  }

  private defaultInclude() {
    return {
      vendeur: { select: { id: true, nom: true, email: true, role: true } },
      caissier: { select: { id: true, nom: true, email: true, role: true } },
      client: true,
      ticket: { include: { lignes: true } },
      vente: true,
      lignes: true,
    };
  }
}
