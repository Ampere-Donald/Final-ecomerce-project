import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateLigneVenteDto } from './dto/create-ligne-vente.dto';
import { UpdateLigneVenteDto } from './dto/update-ligne-vente.dto';

@Injectable()
export class LigneVenteService {
  constructor(private readonly db: DatabaseService) {}

  async create(createLigneVenteDto: CreateLigneVenteDto) {
    return await this.db.ligneVente.create({
      data: createLigneVenteDto,
      include: { vente: true, produit: true },
    });
  }

  async findAll() {
    return await this.db.ligneVente.findMany({
      include: { vente: true, produit: true },
    });
  }

  findByVente(venteId: string) {
    return this.db.ligneVente.findMany({
      where: { venteId },
      include: { produit: true },
    });
  }

  async findOne(id: string) {
    const ligne = await this.db.ligneVente.findUnique({
      where: { id },
      include: { vente: true, produit: true },
    });
    if (!ligne) {
      throw new NotFoundException(`Ligne vente avec l'id ${id} non trouvée`);
    }
    return ligne;
  }

  async update(id: string, updateLigneVenteDto: UpdateLigneVenteDto) {
    await this.findOne(id);
    return await this.db.ligneVente.update({
      where: { id },
      data: {
        ...updateLigneVenteDto,
        version: { increment: 1 },
      },
      include: { vente: true, produit: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.db.ligneVente.delete({
      where: { id },
    });
  }
}
