import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class PrimeService {
  constructor(private readonly db: DatabaseService) {}

  async classement(periode: string) {
    const primes = await this.db.primeVendeur.findMany({
      where: { periode },
      include: {
        vendeur: { select: { id: true, nom: true, email: true, role: true } },
      },
      orderBy: [{ nombreTickets: 'desc' }, { montantTotal: 'desc' }],
    });

    const maxTickets = Math.max(0, ...primes.map((p) => p.nombreTickets));
    const maxCA = Math.max(
      0,
      ...primes.map((p) => this.toNumber(p.montantTotal)),
    );

    return primes.map((prime, index) => ({
      rang: index + 1,
      ...prime,
      champTickets: prime.nombreTickets > 0 && prime.nombreTickets === maxTickets,
      champCA: this.toNumber(prime.montantTotal) > 0 && this.toNumber(prime.montantTotal) === maxCA,
    }));
  }

  async monScore(vendeurId: string) {
    const periode = this.getPeriode(new Date());
    const prime = await this.db.primeVendeur.findUnique({
      where: { vendeurId_periode: { vendeurId, periode } },
    });

    return (
      prime ?? {
        periode,
        nombreTickets: 0,
        montantTotal: 0,
        statut: 'EN_COURS',
      }
    );
  }

  async detailVendeur(vendeurId: string, periode: string) {
    const [year, month] = periode.split('-').map(Number);
    if (!year || !month) return [];

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    return this.db.ticketVente.findMany({
      where: {
        vendeurId,
        statut: 'ENCAISSE',
        encaisseAt: { gte: start, lt: end },
      },
      include: {
        lignes: true,
        facture: {
          select: {
            id: true,
            numero: true,
            totalTTC: true,
            dateEmission: true,
            caissier: { select: { id: true, nom: true } },
          },
        },
      },
      orderBy: { encaisseAt: 'desc' },
    });
  }

  async valider(id: string, actorId: string) {
    await this.ensureExists(id);
    return this.db.primeVendeur.update({
      where: { id },
      data: {
        statut: 'VALIDEE',
        valideeById: actorId,
        valideeAt: new Date(),
      },
      include: {
        vendeur: { select: { id: true, nom: true, email: true, role: true } },
        valideeBy: { select: { id: true, nom: true, email: true, role: true } },
      },
    });
  }

  async payer(id: string) {
    await this.ensureExists(id);
    return this.db.primeVendeur.update({
      where: { id },
      data: { statut: 'PAYEE' },
      include: {
        vendeur: { select: { id: true, nom: true, email: true, role: true } },
        valideeBy: { select: { id: true, nom: true, email: true, role: true } },
      },
    });
  }

  private async ensureExists(id: string) {
    const prime = await this.db.primeVendeur.findUnique({ where: { id } });
    if (!prime) throw new NotFoundException('Prime introuvable');
  }

  private toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private getPeriode(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}
