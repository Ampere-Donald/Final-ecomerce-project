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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CategorieService } from './categorie.service';
import { CreateCategorieDto } from './dto/create-categorie.dto';
import { UpdateCategorieDto } from './dto/update-categorie.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

const memStore = { storage: memoryStorage() };

@Controller('categories')
export class CategorieController {
  constructor(
    private readonly categorieService: CategorieService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Post()
  create(@Body() createCategorieDto: CreateCategorieDto) {
    return this.categorieService.create(createCategorieDto);
  }

  @Get()
  findAll() {
    return this.categorieService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.categorieService.findOne(id);
  }

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

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategorieDto: UpdateCategorieDto,
  ) {
    return this.categorieService.update(id, updateCategorieDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categorieService.remove(id);
  }
}
