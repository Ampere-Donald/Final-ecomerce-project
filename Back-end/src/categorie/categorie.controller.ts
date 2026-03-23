import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CategorieService } from './categorie.service';
import { CreateCategorieDto } from './dto/create-categorie.dto';
import { UpdateCategorieDto } from './dto/update-categorie.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';

const memStore = { storage: memoryStorage() };

@Controller('categories')
export class CategorieController {
  constructor(
    private readonly categorieService: CategorieService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Post()
  create(@Request() req: any, @Body() createCategorieDto: CreateCategorieDto) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.categorieService.create(createCategorieDto, actor);
  }

  @Get()
  findAll() {
    return this.categorieService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.categorieService.findOne(id);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file', memStore))
  async uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const oldCategorie = await this.categorieService.findOne(id);
    const imageUrl = await this.cloudinary.uploadBuffer(file.buffer, {
      folder: 'categories',
    });
    const result = await this.categorieService.uploadImage(id, imageUrl);
    if (oldCategorie.imageUrl && oldCategorie.imageUrl !== imageUrl) {
      this.cloudinary.deleteByUrl(oldCategorie.imageUrl).catch(() => {});
    }
    return result;
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() updateCategorieDto: UpdateCategorieDto,
  ) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.categorieService.update(id, updateCategorieDto, actor);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.categorieService.remove(id, actor);
  }
}
