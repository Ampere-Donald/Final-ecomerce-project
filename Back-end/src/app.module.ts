import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CategorieModule } from './categorie/categorie.module';
import { ProduitModule } from './produit/produit.module';
import { AttributModule } from './attribut/attribut.module';
import { ValeurAttributModule } from './valeur-attribut/valeur-attribut.module';
import { VarianteProduitModule } from './variante-produit/variante-produit.module';
import { VarianteProduitAttributModule } from './variante-produit-attribut/variante-produit-attribut.module';
import { FournisseurModule } from './fournisseur/fournisseur.module';
import { ClientModule } from './client/client.module';
import { AchatModule } from './achat/achat.module';
import { LigneAchatModule } from './ligne-achat/ligne-achat.module';
import { VenteModule } from './vente/vente.module';
import { LigneVenteModule } from './ligne-vente/ligne-vente.module';
import { MouvementStockModule } from './mouvement-stock/mouvement-stock.module';
import { CaisseModule } from './caisse/caisse.module';
import { RoleModule } from './role/role.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    CategorieModule,
    ProduitModule,
    AttributModule,
    ValeurAttributModule,
    VarianteProduitModule,
    VarianteProduitAttributModule,
    FournisseurModule,
    ClientModule,
    AchatModule,
    LigneAchatModule,
    VenteModule,
    LigneVenteModule,
    MouvementStockModule,
    CaisseModule,
    RoleModule,
    DatabaseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
