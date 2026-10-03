import { Module } from '@nestjs/common';
import { AvisService } from './avis.service';
import { AvisController } from './avis.controller';
import { GuestAvisController } from './guest-avis.controller';
import { GuestAvisService } from './guest-avis.service';
import { AuthModule } from '../auth/auth.module';
@Module({
  imports: [AuthModule],
  controllers: [AvisController, GuestAvisController],
  providers: [AvisService, GuestAvisService],
})
export class AvisModule {}
