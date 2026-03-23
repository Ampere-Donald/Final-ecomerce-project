import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { FavoriModule } from './favori/favori.module';
import { DatabaseModule } from './database/database.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
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
    AdminAuthModule,
    FavoriModule,
    DatabaseModule,
    NewsletterModule,
    CloudinaryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
