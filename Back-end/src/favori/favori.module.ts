import { Module } from '@nestjs/common';
import { FavoriService } from './favori.service';
import { FavoriController } from './favori.controller';

@Module({
  controllers: [FavoriController],
  providers: [FavoriService],
})
export class FavoriModule {}
