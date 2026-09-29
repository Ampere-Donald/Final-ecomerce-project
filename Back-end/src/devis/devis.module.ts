import { Module } from "@nestjs/common";
import { ProformaModule } from "../proforma/proforma.module";
import { DevisController } from "./devis.controller";
import { DevisService } from "./devis.service";
import { DevisAcceptService } from "./devis-accept.service";

@Module({
  imports: [ProformaModule],
  controllers: [DevisController],
  providers: [DevisService, DevisAcceptService],
})
export class DevisModule {}
