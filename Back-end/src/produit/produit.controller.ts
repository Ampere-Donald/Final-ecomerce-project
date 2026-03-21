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
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync } from 'fs';
import { ProduitService } from './produit.service';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';

@Controller('produits')
export class ProduitController {
  constructor(private readonly produitService: ProduitService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 3, {
      // TODO: passer sur Cloudinary en prod (pour scaler).
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  create(
    @Body() createProduitDto: CreateProduitDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    // 1. Gérer les images existantes
    let existingImages: string[] = [];
    if (createProduitDto.existingImages) {
      try {
        existingImages = typeof createProduitDto.existingImages === 'string' 
          ? JSON.parse(createProduitDto.existingImages) 
          : createProduitDto.existingImages;
      } catch (e) {
        existingImages = Array.isArray(createProduitDto.existingImages) 
          ? createProduitDto.existingImages 
          : [createProduitDto.existingImages as string];
      }
    }
    
    // 2. Gérer les nouvelles images
    const newFileUrls = (files || []).map(f => `/uploads/${f.filename}`);
    
    // 3. Fusionner et assigner aux 3 slots
    const finalImages = [...existingImages, ...newFileUrls].slice(0, 3);
    createProduitDto.imageUrl = finalImages[0] || undefined;
    createProduitDto.imageUrl2 = finalImages[1] || undefined;
    createProduitDto.imageUrl3 = finalImages[2] || undefined;
    delete createProduitDto.existingImages;
    // Parsing manuel de sécurité pour les champs envoyés en FormData (strings)
    if (createProduitDto.prixGros != null) createProduitDto.prixGros = parseFloat(String(createProduitDto.prixGros));
    if (createProduitDto.prixDetail != null) createProduitDto.prixDetail = parseFloat(String(createProduitDto.prixDetail));
    if (createProduitDto.quantiteStock != null) createProduitDto.quantiteStock = parseInt(String(createProduitDto.quantiteStock), 10);
    // prixPromo : chaîne vide → undefined (pas de promo)
    const prixPromoStr = String(createProduitDto.prixPromo ?? '');
    createProduitDto.prixPromo = prixPromoStr !== '' ? parseFloat(prixPromoStr) : undefined;
    if (createProduitDto.prixPromo !== undefined && isNaN(createProduitDto.prixPromo)) createProduitDto.prixPromo = undefined;
    // finPromo : chaîne vide → undefined
    const finPromoStr = String(createProduitDto.finPromo ?? '');
    createProduitDto.finPromo = finPromoStr !== '' ? finPromoStr : undefined;
    // isPopulaire : string 'true'/'false' → boolean
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
    console.log('--- GET /api/produits CALLED WITH PARAMS ---', { page, limit, search, categoryId, minPrice, maxPrice, inStock, sort });
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

  // ── Routes spécifiques AVANT :id ─────────────────────────────────────────
  @Get('flash')
  findFlash() {
    return this.produitService.findFlash();
  }

  @Get('populaires')
  findPopulaires() {
    return this.produitService.findPopulaires();
  }

  // ── Import CSV en masse ─────────────────────────────────────────────────
  // diskStorage : le CSV est écrit sur disque avant d'être lu en streaming.
  // Cela évite de charger le fichier brut en RAM (OOM sur les gros fichiers).
  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, _file, cb) =>
          cb(null, `csv-import-${Date.now()}-${Math.round(Math.random() * 1e6)}.csv`),
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.originalname.match(/\.csv$/i)) {
          return cb(
            new BadRequestException('Seuls les fichiers .csv sont acceptés.'),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 15 * 1024 * 1024 }, // 15 Mo max
    }),
  )
  async importCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier CSV fourni.');
    }
    // On passe le chemin disque au service (jamais le buffer en RAM)
    return this.produitService.importCsv(file.path);
  }

  // ── Nettoyage des imageUrl invalides (fichiers absents du disque) ────────
  @Post('cleanup-images')
  async cleanupImages() {
    return this.produitService.cleanupInvalidImages();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.produitService.findOne(id);
  }

  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('file', {
      // TODO: passer sur Cloudinary en prod (pour scaler).
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const imageUrl = `/uploads/${file.filename}`;
    return this.produitService.uploadImage(id, imageUrl);
  }

  @Patch(':id')
  @UseInterceptors(
    FilesInterceptor('files', 3, {
      // TODO: passer sur Cloudinary en prod (pour scaler).
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProduitDto: UpdateProduitDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    // 1. Gérer les images existantes (ce que le front-end a décidé de garder)
    let existingImages: string[] = [];
    if (updateProduitDto.existingImages !== undefined) {
      try {
        existingImages = typeof updateProduitDto.existingImages === 'string' && updateProduitDto.existingImages.startsWith('[')
          ? JSON.parse(updateProduitDto.existingImages) 
          : updateProduitDto.existingImages;
      } catch (e) {
        existingImages = Array.isArray(updateProduitDto.existingImages) 
          ? updateProduitDto.existingImages 
          : (updateProduitDto.existingImages ? [updateProduitDto.existingImages as string] : []);
      }
      
      // 2. Nouvelles images
      const newFileUrls = (files || []).map(f => `/uploads/${f.filename}`);
      
      // 3. Assigner aux slots (jusqu'à 3 images)
      const finalImages = [...existingImages, ...newFileUrls].slice(0, 3);
      (updateProduitDto as any).imageUrl = finalImages[0] || null;
      (updateProduitDto as any).imageUrl2 = finalImages[1] || null;
      (updateProduitDto as any).imageUrl3 = finalImages[2] || null;
      delete updateProduitDto.existingImages;
    } else if (files && files.length > 0) {
      // Fallback si front-end n'envoie pas existingImages mais envoie juste des files (au cas où)
      updateProduitDto.imageUrl = `/uploads/${files[0].filename}`;
      if (files[1]) updateProduitDto.imageUrl2 = `/uploads/${files[1].filename}`;
      if (files[2]) updateProduitDto.imageUrl3 = `/uploads/${files[2].filename}`;
    }
    // Parsing manuel de sécurité pour les champs envoyés en FormData (strings)
    if (updateProduitDto.prixGros != null) updateProduitDto.prixGros = parseFloat(String(updateProduitDto.prixGros));
    if (updateProduitDto.prixDetail != null) updateProduitDto.prixDetail = parseFloat(String(updateProduitDto.prixDetail));
    if (updateProduitDto.quantiteStock != null) updateProduitDto.quantiteStock = parseInt(String(updateProduitDto.quantiteStock), 10);
    // prixPromo : chaîne vide → null (retirer la promo)
    const prixPromoStr = String(updateProduitDto.prixPromo ?? '');
    (updateProduitDto as any).prixPromo = prixPromoStr !== '' ? parseFloat(prixPromoStr) : null;
    if (typeof (updateProduitDto as any).prixPromo === 'number' && isNaN((updateProduitDto as any).prixPromo)) (updateProduitDto as any).prixPromo = null;
    // finPromo : chaîne vide → null
    const finPromoStr = String(updateProduitDto.finPromo ?? '');
    (updateProduitDto as any).finPromo = finPromoStr !== '' ? finPromoStr : null;
    // isPopulaire : string 'true'/'false' → boolean
    updateProduitDto.isPopulaire = String(updateProduitDto.isPopulaire) === 'true';
    return this.produitService.update(id, updateProduitDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.produitService.remove(id);
  }
}
