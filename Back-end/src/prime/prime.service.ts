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
      orderBy: { nombreTickets: 'desc' },
    });

    return primes.map((prime, index) => ({
      rang: index + 1,
      ...prime,
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
        statut: 'EN_COURS',
      }
    );
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

  private getPeriode(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}
