import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CategorieModule } from './categorie/categorie.module';
import { ProduitModule } from './produit/produit.module';
import { AttributModule } from './attribut/attribut.module';
import { ValeurAttributModule } from './valeur-attribut/valeur-attribut.module';

import { FournisseurModule } from './fournisseur/fournisseur.module';
import { ClientModule } from './client/client.module';
import { AchatModule } from './achat/achat.module';
import { LigneAchatModule } from './ligne-achat/ligne-achat.module';
import { VenteModule } from './vente/vente.module';
import { LigneVenteModule } from './ligne-vente/ligne-vente.module';
import { MouvementStockModule } from './mouvement-stock/mouvement-stock.module';
import { CaisseModule } from './caisse/caisse.module';
import { RoleModule } from './role/role.module';
import { CommandeModule } from './commande/commande.module';
import { NotificationModule } from './notification/notification.module';
import { SearchModule } from './search/search.module';
import { AuthModule } from './auth/auth.module';
import { FavoriModule } from './favori/favori.module';
import { DatabaseModule } from './database/database.module';
import { NewsletterModule } from './newsletter/newsletter.module';

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

    FournisseurModule,
    ClientModule,
    AchatModule,
    LigneAchatModule,
    VenteModule,
    LigneVenteModule,
    MouvementStockModule,
    CaisseModule,
    RoleModule,
    CommandeModule,
    NotificationModule,
    SearchModule,
    AuthModule,
    FavoriModule,
    DatabaseModule,
    NewsletterModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
