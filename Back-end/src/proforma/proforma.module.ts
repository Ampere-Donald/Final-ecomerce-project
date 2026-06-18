import { Module } from '@nestjs/common';
import { BonVenteModule } from 'src/bon-vente/bon-vente.module';
import { ProformaController } from './proforma.controller';
import { ProformaService } from './proforma.service';

@Module({
  imports: [BonVenteModule],
  controllers: [ProformaController],
  providers: [ProformaService],
  exports: [ProformaService],
})
export class ProformaModule {}