import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RoleService {
  constructor(private readonly db: DatabaseService) {}

  async create(createRoleDto: CreateRoleDto) {
    return await this.db.role.create({
      data: createRoleDto,
    });
  }

  async findAll() {
    return await this.db.role.findMany();
  }

  async findOne(id: string) {
    const role = await this.db.role.findUnique({
      where: { id },
    });
    if (!role) {
      throw new NotFoundException(`Rôle avec l'id ${id} non trouvé`);
    }
    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    await this.findOne(id);
    return await this.db.role.update({
      where: { id },
      data: {
        ...updateRoleDto,
        version: { increment: 1 },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.db.role.delete({
      where: { id },
    });
  }
}
