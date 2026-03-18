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
      include: { ventes: true },
    });
  }

  async findOne(id: string) {
    const client = await this.db.client.findUnique({
      where: { id },
      include: { ventes: true },
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
