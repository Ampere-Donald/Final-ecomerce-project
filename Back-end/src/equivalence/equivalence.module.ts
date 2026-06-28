import { Module } from '@nestjs/common';
import { EquivalenceController } from './equivalence.controller';
import { EquivalenceService } from './equivalence.service';
import { GeminiClient } from './gemini.client';

@Module({
  controllers: [EquivalenceController],
  providers: [EquivalenceService, GeminiClient],
  exports: [EquivalenceService, GeminiClient],
})
export class EquivalenceModule {}
