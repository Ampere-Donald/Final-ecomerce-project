import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

type SequenceClient = {
  $queryRawUnsafe?: <T = unknown>(
    query: string,
    ...values: any[]
  ) => Promise<T>;
  documentSequence: {
    upsert: (args: any) => Promise<{ nextValue: number }>;
  };
};

@Injectable()
export class DocumentNumberService {
  constructor(private readonly db: DatabaseService) {}

  nextAnnual(
    type: string,
    prefix: string,
    tx?: SequenceClient,
    date = new Date(),
  ): Promise<string> {
    return this.next(
      type,
      String(date.getFullYear()),
      `${prefix}${date.getFullYear()}-`,
      tx,
    );
  }

  nextDaily(
    type: string,
    prefix: string,
    tx?: SequenceClient,
    date = new Date(),
  ): Promise<string> {
    const period = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    return this.next(type, period, `${prefix}${period}-`, tx);
  }

  private async next(
    type: string,
    period: string,
    prefix: string,
    tx?: SequenceClient,
  ): Promise<string> {
    const client = (tx || this.db) as SequenceClient;

    // La sequence peut avoir ete importee sans son compteur (ou avec un compteur
    // en retard). Le calcul et l'incrementation sont reunis dans une seule requete
    // atomique afin de ne jamais recreer un numero deja present.
    if (client.$queryRawUnsafe) {
      const source =
        type === 'TICKET_QUEUE'
          ? { table: 'ticket_vente', column: 'numero_ticket' }
          : { table: 'facture', column: 'numero' };
      const rows = await client.$queryRawUnsafe<Array<{ nextValue: number }>>(
        `WITH existing_numbers AS (
          SELECT COALESCE(MAX(CAST(SUBSTRING("${source.column}" FROM '([0-9]+)$') AS INTEGER)), 0) + 1 AS candidate
          FROM "${source.table}"
          WHERE "${source.column}" LIKE $4
        )
        INSERT INTO "document_sequence" ("id", "type", "period", "next_value", "updated_at")
        SELECT $1, $2, $3, candidate, CURRENT_TIMESTAMP
        FROM existing_numbers
        ON CONFLICT ("type", "period") DO UPDATE
        SET "next_value" = GREATEST("document_sequence"."next_value" + 1, EXCLUDED."next_value"),
            "updated_at" = CURRENT_TIMESTAMP
        RETURNING "next_value" AS "nextValue"`,
        `${type}:${period}`,
        type,
        period,
        `${prefix}%`,
      );
      const nextValue = Number(rows[0]?.nextValue);
      if (!Number.isInteger(nextValue) || nextValue < 1) {
        throw new Error(`Impossible de generer la sequence ${type}:${period}`);
      }
      return `${prefix}${String(nextValue).padStart(4, '0')}`;
    }

    // Repli utilise par les doubles de test qui n'exposent pas les requetes SQL.
    const sequence = await client.documentSequence.upsert({
      where: { type_period: { type, period } },
      create: { id: `${type}:${period}`, type, period, nextValue: 1 },
      update: { nextValue: { increment: 1 } },
      select: { nextValue: true },
    });
    return `${prefix}${String(sequence.nextValue).padStart(4, '0')}`;
  }
}
