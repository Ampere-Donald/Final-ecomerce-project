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
  UploadedFiles,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage, diskStorage } from 'multer';
import { promises as fs } from 'fs';
import { ProduitService } from './produit.service';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

const memStore = { storage: memoryStorage() };
const memStore3 = { storage: memoryStorage(), limits: { files: 3 } };

@Controller('produits')
export class ProduitController {
  constructor(
    private readonly produitService: ProduitService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // ── Helper: upload multer files to Cloudinary, return URLs ────────────────
  private async uploadFilesToCloudinary(files: Express.Multer.File[]): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const url = await this.cloudinary.uploadBuffer(file.buffer, { folder: 'produits' });
      urls.push(url);
    }
    return urls;
  }

  @Post()
  @UseInterceptors(FilesInterceptor('files', 3, memStore))
  async create(
    @Body() createProduitDto: CreateProduitDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    // 1. Handle existing images (Cloudinary URLs kept by frontend)
    let existingImages: string[] = [];
    if (createProduitDto.existingImages) {
      try {
        existingImages = typeof createProduitDto.existingImages === 'string'
          ? JSON.parse(createProduitDto.existingImages)
          : createProduitDto.existingImages;
      } catch {
        existingImages = Array.isArray(createProduitDto.existingImages)
          ? createProduitDto.existingImages
          : [createProduitDto.existingImages as string];
      }
    }

    // 2. Upload new files to Cloudinary
    const newFileUrls = files?.length
      ? await this.uploadFilesToCloudinary(files)
      : [];

    // 3. Merge and assign to 3 slots
    const finalImages = [...existingImages, ...newFileUrls].slice(0, 3);
    createProduitDto.imageUrl = finalImages[0] || undefined;
    createProduitDto.imageUrl2 = finalImages[1] || undefined;
    createProduitDto.imageUrl3 = finalImages[2] || undefined;
    delete createProduitDto.existingImages;

    // FormData string parsing
    if (createProduitDto.prixGros != null) createProduitDto.prixGros = parseFloat(String(createProduitDto.prixGros));
    if (createProduitDto.prixDetail != null) createProduitDto.prixDetail = parseFloat(String(createProduitDto.prixDetail));
    if (createProduitDto.quantiteStock != null) createProduitDto.quantiteStock = parseInt(String(createProduitDto.quantiteStock), 10);
    const prixPromoStr = String(createProduitDto.prixPromo ?? '');
    createProduitDto.prixPromo = prixPromoStr !== '' ? parseFloat(prixPromoStr) : undefined;
    if (createProduitDto.prixPromo !== undefined && isNaN(createProduitDto.prixPromo)) createProduitDto.prixPromo = undefined;
    const finPromoStr = String(createProduitDto.finPromo ?? '');
    createProduitDto.finPromo = finPromoStr !== '' ? finPromoStr : undefined;
    createProduitDto.isPopulaire = String(createProduitDto.isPopulaire) === 'true';

    return this.produitService.create(createProduitDto);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('inStock') inStock?: string,
    @Query('sort') sort?: string,
  ) {
    return this.produitService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 1000,
      search,
      categoryId,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      inStock: inStock === 'true',
      sort,
    });
  }

  @Get('metadata')
  getMetadata() {
    return this.produitService.getMetadata();
  }

  @Get('flash')
  findFlash() {
    return this.produitService.findFlash();
  }

  @Get('populaires')
  findPopulaires() {
    return this.produitService.findPopulaires();
  }

  // ── Import ZIP (CSV + images) or plain CSV en masse ─────────────────────
  // diskStorage : les fichiers sont écrits sur le disque. Le ZIP sera chargé
  // en mémoire pour extraction, et le CSV sera lu en flux.
  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const isZip = file.originalname.toLowerCase().endsWith('.zip');
          const ext = isZip ? '.zip' : '.csv';
          cb(null, `import-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.originalname.match(/\.(csv|zip)$/i)) {
          return cb(
            new BadRequestException('Seuls les fichiers .csv ou .zip sont acceptés.'),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 250 * 1024 * 1024 }, // 250 Mo max (ZIP avec images HD)
    }),
  )
  async importProducts(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni.');
    }

    const isZip = file.originalname.toLowerCase().endsWith('.zip');

    if (isZip) {
      try {
        // Read file into memory to pass buffer to AdmZip in the service
        const buffer = await fs.readFile(file.path);
        const result = await this.produitService.importZip(buffer);
        // Clean up the temp zip file from disk
        await fs.unlink(file.path).catch(() => {});
        return result;
      } catch (err) {
        // Clean up even on failure
        await fs.unlink(file.path).catch(() => {});
        throw err;
      }
    }

    // CSV direct (Streaming - passe le chemin du disque au service)
    return this.produitService.importCsv(file.path);
  }

  // ── Cleanup invalid images ────────────────────────────────────────────────
  @Post('cleanup-images')
  async cleanupImages() {
    return this.produitService.cleanupInvalidImages();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.produitService.findOne(id);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file', memStore))
  async uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const oldProduit = await this.produitService.findOne(id);
    const imageUrl = await this.cloudinary.uploadBuffer(file.buffer, { folder: 'produits' });
    const result = await this.produitService.uploadImage(id, imageUrl);
    if (oldProduit.imageUrl && oldProduit.imageUrl !== imageUrl) {
      this.cloudinary.deleteByUrl(oldProduit.imageUrl).catch(() => {});
    }
    return result;
  }

  @Patch(':id')
  @UseInterceptors(FilesInterceptor('files', 3, memStore))
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProduitDto: UpdateProduitDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const oldProduit = await this.produitService.findOne(id);
    const oldImages = [oldProduit.imageUrl, oldProduit.imageUrl2, oldProduit.imageUrl3].filter(Boolean) as string[];

    // 1. Handle existing images (Cloudinary URLs kept by frontend)
    let existingImages: string[] = [];
    if (updateProduitDto.existingImages !== undefined) {
      try {
        existingImages = typeof updateProduitDto.existingImages === 'string' && updateProduitDto.existingImages.startsWith('[')
          ? JSON.parse(updateProduitDto.existingImages)
          : updateProduitDto.existingImages;
      } catch {
        existingImages = Array.isArray(updateProduitDto.existingImages)
          ? updateProduitDto.existingImages
          : (updateProduitDto.existingImages ? [updateProduitDto.existingImages as string] : []);
      }

      // 2. Upload new files to Cloudinary
      const newFileUrls = files?.length
        ? await this.uploadFilesToCloudinary(files)
        : [];

      // 3. Assign to slots (up to 3 images)
      const finalImages = [...existingImages, ...newFileUrls].slice(0, 3);
      (updateProduitDto as any).imageUrl = finalImages[0] || null;
      (updateProduitDto as any).imageUrl2 = finalImages[1] || null;
      (updateProduitDto as any).imageUrl3 = finalImages[2] || null;
      delete updateProduitDto.existingImages;
    } else if (files && files.length > 0) {
      const newFileUrls = await this.uploadFilesToCloudinary(files);
      updateProduitDto.imageUrl = newFileUrls[0] || undefined;
      if (newFileUrls[1]) updateProduitDto.imageUrl2 = newFileUrls[1];
      if (newFileUrls[2]) updateProduitDto.imageUrl3 = newFileUrls[2];
    }

    // FormData string parsing
    if (updateProduitDto.prixGros != null) updateProduitDto.prixGros = parseFloat(String(updateProduitDto.prixGros));
    if (updateProduitDto.prixDetail != null) updateProduitDto.prixDetail = parseFloat(String(updateProduitDto.prixDetail));
    if (updateProduitDto.quantiteStock != null) updateProduitDto.quantiteStock = parseInt(String(updateProduitDto.quantiteStock), 10);
    const prixPromoStr = String(updateProduitDto.prixPromo ?? '');
    (updateProduitDto as any).prixPromo = prixPromoStr !== '' ? parseFloat(prixPromoStr) : null;
    if (typeof (updateProduitDto as any).prixPromo === 'number' && isNaN((updateProduitDto as any).prixPromo)) (updateProduitDto as any).prixPromo = null;
    const finPromoStr = String(updateProduitDto.finPromo ?? '');
    (updateProduitDto as any).finPromo = finPromoStr !== '' ? finPromoStr : null;
    if (updateProduitDto.isPopulaire !== undefined) updateProduitDto.isPopulaire = String(updateProduitDto.isPopulaire) === 'true';

    const result = await this.produitService.update(id, updateProduitDto);
    
    // Cleanup orphaned images
    const newImages = [result.imageUrl, result.imageUrl2, result.imageUrl3].filter(Boolean) as string[];
    const imagesToDelete = oldImages.filter(url => !newImages.includes(url));
    imagesToDelete.forEach(url => this.cloudinary.deleteByUrl(url).catch(() => {}));

    return result;
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.produitService.remove(id);
  }
}
