import { Injectable, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class NewsletterService {
  constructor(private readonly db: DatabaseService) {}

  async subscribe(email: string) {
    const existing = await this.db.newsletter.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Cet email est déjà inscrit à la newsletter.');
    }
    return this.db.newsletter.create({ data: { email } });
  }
}
