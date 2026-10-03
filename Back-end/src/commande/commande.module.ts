import { Module } from '@nestjs/common';
import { CommandeService } from './commande.service';
import { CommandeController } from './commande.controller';
import { AuthModule } from 'src/auth/auth.module';
import { GuestOrderController } from './guest-order.controller';
import { GuestOrderService } from './guest-order.service';
import { GuestLinkController } from './guest-link.controller';
import { GuestLinkService } from './guest-link.service';

@Module({
  imports: [AuthModule],
  controllers: [CommandeController, GuestOrderController, GuestLinkController],
  providers: [CommandeService, GuestOrderService, GuestLinkService],
  exports: [CommandeService],
})
export class CommandeModule {}
