import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsObject, IsOptional, Matches, IsInt, IsNotEmpty, IsString, IsUUID, MaxLength, Min, ValidateNested } from 'class-validator';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';
import { DocumentaryService } from './documentary.service';
class DocumentaryTextDto {
 @IsString() @IsNotEmpty() @MaxLength(150) display_title!: string;
 @IsString() @IsNotEmpty() @MaxLength(20000) short_description!: string;
 @IsString() @IsNotEmpty() @MaxLength(50000) description!: string;
}
export class DocumentaryEditDto {
 @IsUUID() operationId!: string;
 @IsInt() @Min(0) expectedRevision!: number;
 @ValidateNested() @Type(() => DocumentaryTextDto) text!: DocumentaryTextDto;
 @IsBoolean() validate!: boolean;
}
class StructuredEditDto {
 @IsOptional() @Matches(/^[a-f0-9]{64}$/) expectedProductFingerprint?: string;
 @IsUUID() operationId!: string;
 @IsInt() @Min(0) expectedRevision!: number;
 @IsIn(['draft','publish','rollback']) action!: string;
 @IsOptional() @IsObject() content?: Record<string,unknown>;
}
@Controller('catalogue-documentary')
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class DocumentaryController {
 constructor(private readonly documents: DocumentaryService) {}
 @Get() @Header('Cache-Control', 'no-store')
 list(@Query('search') search = '', @Query('status') status = '', @Query('page') page = '1') {
  return this.documents.list(search, status, page);
 }
 @Get(':id') @Header('Cache-Control', 'no-store')
 detail(@Param('id', ParseUUIDPipe) id: string) { return this.documents.detail(id); }
 @Patch(':id/structured')
 structured(@Param('id', ParseUUIDPipe) id: string,@Body() input: StructuredEditDto,@Request() req: any) { return this.documents.structured(id,input,req.user.id); }
 @Patch(':id')
 edit(@Param('id', ParseUUIDPipe) id: string, @Body() input: DocumentaryEditDto, @Request() req: any) {
  return this.documents.edit(id, input, req.user.id);
 }
}
