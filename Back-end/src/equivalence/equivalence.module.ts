import { Module } from '@nestjs/common';
import { EquivalenceController } from './equivalence.controller';
import { EquivalenceService } from './equivalence.service';
import { GeminiClient } from './gemini.client';
import { ReplacementCaseController } from './replacement-case.controller';
import { ReplacementCaseService } from './replacement-case.service';

@Module({
  controllers: [EquivalenceController, ReplacementCaseController],
  providers: [EquivalenceService, GeminiClient, ReplacementCaseService],
  exports: [EquivalenceService, GeminiClient],
})
export class EquivalenceModule {}
