import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IncompatibilitesController } from './incompatibilites.controller';
import { IncompatibilitesService } from './incompatibilites.service';
import { GuestIncompatibilitesController } from './guest-incompatibilites.controller';
import { GuestIncompatibilitesService } from './guest-incompatibilites.service';
@Module({
  imports: [AuthModule],
  controllers: [IncompatibilitesController, GuestIncompatibilitesController],
  providers: [IncompatibilitesService, GuestIncompatibilitesService],
})
export class IncompatibilitesModule {}
