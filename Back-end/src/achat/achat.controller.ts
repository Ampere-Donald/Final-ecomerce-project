import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AchatService } from './achat.service';
import { CreateAchatDto } from './dto/create-achat.dto';
import { UpdateAchatDto } from './dto/update-achat.dto';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';

@UseGuards(AdminAuthGuard)
@Controller('achats')
export class AchatController {
  constructor(private readonly achatService: AchatService) {}

  @Post()
  create(@Body() createAchatDto: CreateAchatDto) {
    return this.achatService.create(createAchatDto);
  }

  @Get()
  findAll() {
    return this.achatService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.achatService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAchatDto: UpdateAchatDto,
  ) {
    return this.achatService.update(id, updateAchatDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.achatService.remove(id);
  }
}
