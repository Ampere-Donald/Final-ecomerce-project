import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientService {
  constructor(private readonly db: DatabaseService) {}

  async create(createClientDto: CreateClientDto) {
    return await this.db.client.create({
      data: createClientDto,
    });
  }

  async findAll() {
    return await this.db.client.findMany({
      select: {
        id: true,
        nom: true,
        prenom: true,
        telephone: true,
        email: true,
        adresse: true,
        typeClient: true,
        emailVerifie: true,
        createdAt: true,
        version: true,
        _count: { select: { commandes: true, ventes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const client = await this.db.client.findUnique({
      where: { id },
      select: {
        id: true,
        nom: true,
        prenom: true,
        telephone: true,
        email: true,
        adresse: true,
        typeClient: true,
        emailVerifie: true,
        createdAt: true,
        version: true,
        commandes: {
          select: {
            id: true,
            numeroSuivi: true,
            montantTotal: true,
            statut: true,
            dateCommande: true,
            modeReception: true,
          },
          orderBy: { dateCommande: 'desc' },
          take: 10,
        },
        _count: { select: { commandes: true, ventes: true } },
      },
    });
    if (!client) {
      throw new NotFoundException(`Client avec l'id ${id} non trouvé`);
    }
    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto) {
    await this.findOne(id);
    return await this.db.client.update({
      where: { id },
      data: {
        ...updateClientDto,
        version: { increment: 1 },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.db.client.delete({
      where: { id },
    });
  }
}
