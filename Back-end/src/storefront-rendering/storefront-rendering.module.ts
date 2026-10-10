import { Module } from '@nestjs/common';
import { ProduitModule } from '../produit/produit.module';
import { CategorieModule } from '../categorie/categorie.module';
import { StorefrontRenderingService } from './storefront-rendering.service';
import { StorefrontRenderingController } from './storefront-rendering.controller';

@Module({ imports: [ProduitModule, CategorieModule],
  providers: [StorefrontRenderingService], controllers: [StorefrontRenderingController] })
export class StorefrontRenderingModule {}
