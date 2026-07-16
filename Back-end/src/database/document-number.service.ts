import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

type SequenceClient = {
  documentSequence: {
    upsert: (args: any) => Promise<{ nextValue: number }>;
  };
};

@Injectable()
export class DocumentNumberService {
  constructor(private readonly db: DatabaseService) {}

  nextAnnual(type: string, prefix: string, tx?: SequenceClient, date = new Date()): Promise<string> {
    return this.next(type, String(date.getFullYear()), `${prefix}${date.getFullYear()}-`, tx);
  }

  nextDaily(type: string, prefix: string, tx?: SequenceClient, date = new Date()): Promise<string> {
    const period = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    return this.next(type, period, `${prefix}${period}-`, tx);
  }

  private async next(type: string, period: string, prefix: string, tx?: SequenceClient): Promise<string> {
    const sequence = await (tx || this.db).documentSequence.upsert({
      where: { type_period: { type, period } },
      create: { id: `${type}:${period}`, type, period, nextValue: 1 },
      update: { nextValue: { increment: 1 } },
      select: { nextValue: true },
    });
    return `${prefix}${String(sequence.nextValue).padStart(4, '0')}`;
  }
}
