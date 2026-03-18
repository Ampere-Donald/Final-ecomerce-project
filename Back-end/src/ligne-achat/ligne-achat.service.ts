import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateLigneAchatDto } from './dto/create-ligne-achat.dto';
import { UpdateLigneAchatDto } from './dto/update-ligne-achat.dto';

@Injectable()
export class LigneAchatService {
  constructor(private readonly db: DatabaseService) {}

  async create(createLigneAchatDto: CreateLigneAchatDto) {
    return await this.db.ligneAchat.create({
      data: createLigneAchatDto,
      include: { achat: true, varianteProduit: true },
    });
  }

  async findAll() {
    return await this.db.ligneAchat.findMany({
      include: { achat: true, varianteProduit: true },
    });
  }

  findByAchat(achatId: string) {
    return this.db.ligneAchat.findMany({
      where: { achatId },
      include: { varianteProduit: true },
    });
  }

  async findOne(id: string) {
    const ligne = await this.db.ligneAchat.findUnique({
      where: { id },
      include: { achat: true, varianteProduit: true },
    });
    if (!ligne) {
      throw new NotFoundException(`Ligne achat avec l'id ${id} non trouvée`);
    }
    return ligne;
  }

  async update(id: string, updateLigneAchatDto: UpdateLigneAchatDto) {
    await this.findOne(id);
    return await this.db.ligneAchat.update({
      where: { id },
      data: {
        ...updateLigneAchatDto,
        version: { increment: 1 },
      },
      include: { achat: true, varianteProduit: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.db.ligneAchat.delete({
      where: { id },
    });
  }
}
