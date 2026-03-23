import { Controller, Post, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminAuthGuard } from './admin-auth.guard';

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
}
