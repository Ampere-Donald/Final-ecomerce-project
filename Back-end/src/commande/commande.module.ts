import { Module } from '@nestjs/common';
import { CommandeService } from './commande.service';
import { CommandeController } from './commande.controller';
import { AuthModule } from 'src/auth/auth.module';
import { GuestOrderController } from './guest-order.controller';
import { GuestOrderService } from './guest-order.service';
import { GuestLinkController } from './guest-link.controller';
import { GuestLinkService } from './guest-link.service';
import { GuestActionController } from './guest-action.controller';
import { GuestActionService } from './guest-action.service';

@Module({
  imports: [AuthModule],
  controllers: [
    CommandeController,
    GuestOrderController,
    GuestLinkController,
    GuestActionController,
  ],
  providers: [
    CommandeService,
    GuestOrderService,
    GuestLinkService,
    GuestActionService,
  ],
  exports: [CommandeService],
})
export class CommandeModule {}
