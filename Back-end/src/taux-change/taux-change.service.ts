import { Injectable, Logger } from '@nestjs/common';
import { Devise, SourceTaux } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { Decimal } from '@prisma/client/runtime/client';

const FCFA_PER_EUR = new Decimal('655.957'); // XAF arrime a EUR, taux fixe

@Injectable()
export class TauxChangeService {
  private readonly logger = new Logger(TauxChangeService.name);

  constructor(private readonly db: DatabaseService) {}

  /** Retourne 1 pour FCFA (devise interne). */
  isFcfa(devise: Devise): boolean {
    return devise === Devise.FCFA;
  }

  /**
   * Recupere le taux en ligne via Frankfurter (gratuit, pas de cle API).
   * CNY/NGN -> XAF via cross-rate EUR.
   * Fallback sur dernier taux connu si API indisponible.
   */
  async fetchFromApi(devise: Devise): Promise<{ tauxVersFcfa: Decimal; raw: unknown }> {
    if (this.isFcfa(devise)) {
      return { tauxVersFcfa: new Decimal('1'), raw: null };
    }

    try {
      const res = await fetch(`https://api.frankfurter.app/latest?from=${devise}&to=EUR`);
      if (!res.ok) throw new Error(`Frankfurter HTTP ${res.status}`);
      const data = (await res.json()) as { rates: Record<string, number> };
      const rateToEur = data.rates['EUR'];
      if (!rateToEur) throw new Error('EUR rate missing');
      // devise -> EUR -> XAF
      const tauxVersFcfa = new Decimal(rateToEur.toString()).mul(FCFA_PER_EUR);
      return { tauxVersFcfa, raw: data };
    } catch (err) {
      this.logger.warn(`API taux indisponible pour ${devise}: ${(err as Error).message}`);
      throw err;
    }
  }

  /** Taux le plus recent pour une devise (DB ou API), avec fallback. */
  async getLatest(devise: Devise): Promise<{
    tauxVersFcfa: Decimal;
    source: SourceTaux;
    fetchedAt: Date;
    fromCache: boolean;
    alerteEcart?: string;
  }> {
    if (this.isFcfa(devise)) {
      return {
        tauxVersFcfa: new Decimal('1'),
        source: SourceTaux.API,
        fetchedAt: new Date(),
        fromCache: false,
      };
    }

    let apiTaux: Decimal | null = null;

    try {
      const { tauxVersFcfa, raw } = await this.fetchFromApi(devise);
      apiTaux = tauxVersFcfa;

      const saved = await this.db.tauxChange.create({
        data: {
          devise,
          tauxVersFcfa,
          source: SourceTaux.API,
          fetchedAt: new Date(),
          rawPayload: raw as any,
        },
      });

      return {
        tauxVersFcfa: saved.tauxVersFcfa,
        source: SourceTaux.API,
        fetchedAt: saved.fetchedAt,
        fromCache: false,
      };
    } catch {
      // Fallback sur dernier taux connu
      const last = await this.db.tauxChange.findFirst({
        where: { devise },
        orderBy: { fetchedAt: 'desc' },
      });
      if (last) {
        return {
          tauxVersFcfa: last.tauxVersFcfa,
          source: last.source,
          fetchedAt: last.fetchedAt,
          fromCache: true,
          alerteEcart: 'API indisponible — dernier taux connu utilise.',
        };
      }
      // Aucun historique : retourner 1 avec alerte
      return {
        tauxVersFcfa: new Decimal('1'),
        source: SourceTaux.MANUEL,
        fetchedAt: new Date(),
        fromCache: false,
        alerteEcart: 'Aucun taux disponible — veuillez saisir un taux manuellement.',
      };
    }
  }

  /** Enregistre un taux saisi manuellement. */
  async saveManual(
    devise: Devise,
    tauxVersFcfa: number,
    source: SourceTaux = SourceTaux.MANUEL,
  ) {
    const saved = await this.db.tauxChange.create({
      data: {
        devise,
        tauxVersFcfa: new Decimal(tauxVersFcfa.toString()),
        source,
        fetchedAt: new Date(),
      },
    });

    // Alerte si ecart > 15% avec le dernier taux API
    let alerteEcart: string | undefined;
    const lastApi = await this.db.tauxChange.findFirst({
      where: { devise, source: SourceTaux.API },
      orderBy: { fetchedAt: 'desc' },
    });
    if (lastApi) {
      const ecart = Math.abs(
        (tauxVersFcfa - lastApi.tauxVersFcfa.toNumber()) / lastApi.tauxVersFcfa.toNumber(),
      );
      if (ecart > 0.15) {
        alerteEcart = `Attention : le taux saisi s'ecarte de ${(ecart * 100).toFixed(0)}% du dernier taux automatique (${lastApi.tauxVersFcfa}).`;
      }
    }

    return { ...saved, alerteEcart };
  }

  /** Historique des taux pour une devise. */
  async getHistory(devise: Devise, limit = 50) {
    return this.db.tauxChange.findMany({
      where: { devise },
      orderBy: { fetchedAt: 'desc' },
      take: limit,
    });
  }

  /** Convertit un montant depuis une devise vers FCFA. */
  convert(montant: Decimal, tauxVersFcfa: Decimal): Decimal {
    return montant.mul(tauxVersFcfa).toDecimalPlaces(2);
  }
}
