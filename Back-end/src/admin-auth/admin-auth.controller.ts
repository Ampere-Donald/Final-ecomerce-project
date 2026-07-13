import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto, AdminPinLoginDto } from './dto/admin-login.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { ChangePasswordDto, UpdateAdminDto, ResetPasswordDto } from './dto/update-admin.dto';
import { AdminAuthGuard } from './admin-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

@Controller('admin-auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('login')
  async login(@Body() dto: AdminLoginDto) {
    return this.adminAuthService.login(dto.username || dto.email || '', dto.motDePasse, dto.pin);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('login-pin')
  async loginPin(@Body() dto: AdminPinLoginDto) {
    return this.adminAuthService.loginWithPin(dto.username, dto.pin);
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
    @Body() body: ChangePasswordDto,
  ) {
    return this.adminAuthService.changePassword(req.user.id, body.oldPassword, body.newPassword);
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
  @Patch('admins/:id/toggle-active')
  toggleActive(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.adminAuthService.toggleActive(id, req.user.id, actor);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get('admins/:id/activity')
  getActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminAuthService.getActivityLog(id, limit ? parseInt(limit, 10) : 50);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get('admins/:id/role-history')
  getRoleHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminAuthService.getRoleHistory(id);
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

  // ── Passation volante — changement de rôle (SUPER_ADMIN only) ────────────

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch(':id/role')
  changerRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { role: AdminRole },
  ) {
    return this.adminAuthService.changerRole(id, body.role);
  }
}
