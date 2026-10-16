import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';
import {
  EvaluateReplacementDto,
  FindReplacementDto,
  ReplacementCaseDto,
  ReviewReplacementDto,
} from './dto/replacement-case.dto';
import { ReplacementCaseService } from './replacement-case.service';

@Controller('equivalence/cas')
export class ReplacementCaseController {
  constructor(private readonly service: ReplacementCaseService) {}

  @Post('evaluer')
  @Header('Cache-Control', 'no-store')
  evaluate(@Body() input: EvaluateReplacementDto) {
    return this.service.evaluate(input);
  }

  @Post('rechercher')
  @Header('Cache-Control', 'no-store')
  find(@Body() input: FindReplacementDto) {
    return this.service.find(input);
  }

  @Get('pieces/:id/preuves')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Header('Cache-Control', 'private, no-store')
  evidence(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('after', new ParseUUIDPipe({ optional: true })) after?: string,
  ) {
    return this.service.evidence(id, after);
  }

  @Get()
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Header('Cache-Control', 'private, no-store')
  list(
    @Query('candidatId', new ParseUUIDPipe({ optional: true }))
    candidatId?: string,
  ) {
    return this.service.list(candidatId);
  }

  @Post()
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Header('Cache-Control', 'private, no-store')
  create(@Body() input: ReplacementCaseDto) {
    return this.service.write(null, input);
  }

  @Get(':id')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Header('Cache-Control', 'private, no-store')
  read(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.read(id);
  }

  @Patch(':id')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Header('Cache-Control', 'private, no-store')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ReplacementCaseDto,
  ) {
    return this.service.write(id, input);
  }

  @Post(':id/relire')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Header('Cache-Control', 'private, no-store')
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ReviewReplacementDto,
    @Req() request: any,
  ) {
    return this.service.review(id, input, request.user.id);
  }
}
