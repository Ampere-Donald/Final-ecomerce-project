import { Controller, Get, Patch, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';

@UseGuards(AdminAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  findAll() {
    return this.notificationService.findAll();
  }

  @Get('unread-count')
  async unreadCount() {
    const count = await this.notificationService.unreadCount();
    return { count };
  }

  @Patch(':id/read')
  markAsRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationService.markAsRead(id);
  }

  @Patch('read-all')
  markAllAsRead() {
    return this.notificationService.markAllAsRead();
  }
}
