import { Module } from '@nestjs/common';
import { ProformaModule } from '../proforma/proforma.module';
import { DevisController } from './devis.controller';
import { DevisService } from './devis.service';

@Module({
  imports: [ProformaModule],
  controllers: [DevisController],
  providers: [DevisService],
})
export class DevisModule {}
