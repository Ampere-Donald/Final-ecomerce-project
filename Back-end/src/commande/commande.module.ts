import { Module } from '@nestjs/common';
import { CommandeService } from './commande.service';
import { CommandeController } from './commande.controller';
import { AuthModule } from 'src/auth/auth.module';
import { GuestOrderController } from './guest-order.controller';
import { GuestOrderService } from './guest-order.service';

@Module({
  imports: [AuthModule],
  controllers: [CommandeController, GuestOrderController],
  providers: [CommandeService, GuestOrderService],
  exports: [CommandeService],
})
export class CommandeModule {}
