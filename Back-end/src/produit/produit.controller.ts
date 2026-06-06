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
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage, diskStorage } from 'multer';
import { promises as fs } from 'fs';
import { ProduitService } from './produit.service';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';

const imageFileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp)$/)) {
    return cb(new BadRequestException('Seuls les fichiers image (jpg, png, gif, webp) sont acceptés'), false);
  }
  cb(null, true);
};

const memStore = { storage: memoryStorage(), fileFilter: imageFileFilter, limits: { fileSize: 5 * 1024 * 1024 } };
const memStore3 = { storage: memoryStorage(), fileFilter: imageFileFilter, limits: { files: 3, fileSize: 5 * 1024 * 1024 } };

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

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Post()
  @UseInterceptors(FilesInterceptor('files', 3, memStore))
  async create(
    @Request() req: any,
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
    if (createProduitDto.quantiteGros != null && String(createProduitDto.quantiteGros) !== '') {
      createProduitDto.quantiteGros = parseInt(String(createProduitDto.quantiteGros), 10);
    }
    if (createProduitDto.prixDetail != null) createProduitDto.prixDetail = parseFloat(String(createProduitDto.prixDetail));
    if (createProduitDto.quantiteStock != null) createProduitDto.quantiteStock = parseInt(String(createProduitDto.quantiteStock), 10);
    if (createProduitDto.seuilAlerte != null) createProduitDto.seuilAlerte = parseInt(String(createProduitDto.seuilAlerte), 10);
    const prixPromoStr = String(createProduitDto.prixPromo ?? '');
    createProduitDto.prixPromo = prixPromoStr !== '' ? parseFloat(prixPromoStr) : undefined;
    if (createProduitDto.prixPromo !== undefined && isNaN(createProduitDto.prixPromo)) createProduitDto.prixPromo = undefined;
    const finPromoStr = String(createProduitDto.finPromo ?? '');
    createProduitDto.finPromo = finPromoStr !== '' ? finPromoStr : undefined;
    createProduitDto.isPopulaire = String(createProduitDto.isPopulaire) === 'true';

    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.produitService.create(createProduitDto, actor);
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

  @Get('import/status')
  getImportStatus() {
    return this.produitService.getImportStatus();
  }

  @UseGuards(AdminAuthGuard)
  @Get('low-stock')
  findLowStock() {
    return this.produitService.findLowStock();
  }

  // ── Import ZIP (CSV + images) or plain CSV en masse ─────────────────────
  // diskStorage : les fichiers sont écrits sur le disque. Le ZIP sera chargé
  // en mémoire pour extraction, et le CSV sera lu en flux.
  @UseGuards(AdminAuthGuard)
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
      limits: { fileSize: 100 * 1024 * 1024 }, // 100 Mo max
    }),
  )
  async importProducts(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni.');
    }

    const isZip = file.originalname.toLowerCase().endsWith('.zip');

    if (isZip) {
      try {
        const buffer = await fs.readFile(file.path);
        // Start background job safely
        this.produitService.importZip(buffer)
          .catch((err) => console.error('[Import ZIP Error caught at controller]', err))
          .finally(() => fs.unlink(file.path).catch(() => {}));
        return { message: "L'importation ZIP est en cours d'exécution en arrière-plan. Vous recevrez une notification une fois terminée." };
      } catch (err) {
        await fs.unlink(file.path).catch(() => {});
        throw err;
      }
    }

    // CSV direct (Streaming - la suppression est gérée dans le service)
    this.produitService.importCsv(file.path).catch((e) => console.error(e));
    return { message: "L'importation CSV est en cours d'exécution en arrière-plan. Vous recevrez une notification une fois terminée." };
  }

  // ── Cleanup invalid images ────────────────────────────────────────────────
  @UseGuards(AdminAuthGuard)
  @Post('cleanup-images')
  async cleanupImages() {
    return this.produitService.cleanupInvalidImages();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.produitService.findOne(id);
  }

  @UseGuards(AdminAuthGuard)
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

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Patch(':id')
  @UseInterceptors(FilesInterceptor('files', 3, memStore))
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
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
    if (updateProduitDto.quantiteGros != null && String(updateProduitDto.quantiteGros) !== '') {
      updateProduitDto.quantiteGros = parseInt(String(updateProduitDto.quantiteGros), 10);
    } else if (String(updateProduitDto.quantiteGros ?? '') === '') {
      (updateProduitDto as any).quantiteGros = null;
    }
    if (updateProduitDto.prixDetail != null) updateProduitDto.prixDetail = parseFloat(String(updateProduitDto.prixDetail));
    if (updateProduitDto.quantiteStock != null) updateProduitDto.quantiteStock = parseInt(String(updateProduitDto.quantiteStock), 10);
    if (updateProduitDto.seuilAlerte != null) updateProduitDto.seuilAlerte = parseInt(String(updateProduitDto.seuilAlerte), 10);
    const prixPromoStr = String(updateProduitDto.prixPromo ?? '');
    (updateProduitDto as any).prixPromo = prixPromoStr !== '' ? parseFloat(prixPromoStr) : null;
    if (typeof (updateProduitDto as any).prixPromo === 'number' && isNaN((updateProduitDto as any).prixPromo)) (updateProduitDto as any).prixPromo = null;
    const finPromoStr = String(updateProduitDto.finPromo ?? '');
    (updateProduitDto as any).finPromo = finPromoStr !== '' ? finPromoStr : null;
    if (updateProduitDto.isPopulaire !== undefined) updateProduitDto.isPopulaire = String(updateProduitDto.isPopulaire) === 'true';

    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    const result = await this.produitService.update(id, updateProduitDto, actor);
    
    // Cleanup orphaned images
    const newImages = [result.imageUrl, result.imageUrl2, result.imageUrl3].filter(Boolean) as string[];
    const imagesToDelete = oldImages.filter(url => !newImages.includes(url));
    imagesToDelete.forEach(url => this.cloudinary.deleteByUrl(url).catch(() => {}));

    return result;
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.produitService.remove(id, actor);
  }
}
