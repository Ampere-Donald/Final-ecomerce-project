import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto, ResetPasswordDto } from './dto/update-admin.dto';
import { AdminAuthGuard } from './admin-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

@Controller('admin-auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  async login(@Body() dto: AdminLoginDto) {
    return this.adminAuthService.login(dto.email, dto.motDePasse);
  }

  @UseGuards(AdminAuthGuard)
  @Get('me')
  async getMe(@Request() req: any) {
    return this.adminAuthService.getMe(req.user.id);
  }

  @UseGuards(AdminAuthGuard)
  @Patch('change-password')
  async changePassword(
    @Request() req: any,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    return this.adminAuthService.changePassword(req.user.id, body.oldPassword, body.newPassword);
  }

  @Post('seed')
  async seed(@Body() body: { email: string; motDePasse: string; nom: string }) {
    return this.adminAuthService.seedFirstAdmin(body.email, body.motDePasse, body.nom);
  }

  // ── CRUD Comptes Admin (SUPER_ADMIN only) ──────────────────────────────

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get('admins')
  findAllAdmins() {
    return this.adminAuthService.findAllAdmins();
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post('admins')
  createAdmin(@Request() req: any, @Body() dto: CreateAdminDto) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.adminAuthService.createAdmin(dto, actor);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch('admins/:id')
  updateAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: UpdateAdminDto,
  ) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.adminAuthService.updateAdmin(id, dto, actor);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch('admins/:id/reset-password')
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: ResetPasswordDto,
  ) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.adminAuthService.resetPassword(id, dto.newPassword, actor);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Delete('admins/:id')
  deleteAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.adminAuthService.deleteAdmin(id, req.user.id, actor);
  }
}
