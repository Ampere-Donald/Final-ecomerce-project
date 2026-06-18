import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
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
import { CaisseJourModule } from './caisse-jour/caisse-jour.module';
import { TicketVenteModule } from './ticket-vente/ticket-vente.module';
import { CoffreModule } from './coffre/coffre.module';
import { EcheanceModule } from './echeance/echeance.module';
import { ReglementModule } from './reglement/reglement.module';
import { EquivalenceModule } from './equivalence/equivalence.module';
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
import { TauxChangeModule } from './taux-change/taux-change.module';
import { CmupModule } from './cmup/cmup.module';
import { BonVenteModule } from './bon-vente/bon-vente.module';
import { FactureModule } from './facture/facture.module';
import { PrimeModule } from './prime/prime.module';
import { InventaireModule } from './inventaire/inventaire.module';
import { ProformaModule } from './proforma/proforma.module';
import { FactureVirtuelleModule } from './facture-virtuelle/facture-virtuelle.module';
import { PaieModule } from './paie/paie.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
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
    CaisseJourModule,
    TicketVenteModule,
    CoffreModule,
    EcheanceModule,
    ReglementModule,
    EquivalenceModule,
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
    TauxChangeModule,
    CmupModule,
    BonVenteModule,
    FactureModule,
    PrimeModule,
    InventaireModule,
    ProformaModule,
    FactureVirtuelleModule,
    PaieModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
