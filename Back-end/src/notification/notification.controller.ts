import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { TypeNotification } from '@prisma/client';

@UseGuards(AdminAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  findAll() {
    return this.notificationService.findAll();
  }

  @Get('all')
  findAllPaginated(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: TypeNotification,
    @Query('actorName') actorName?: string,
    @Query('search') search?: string,
    @Query('lue') lue?: string,
  ) {
    return this.notificationService.findAllPaginated({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      type,
      actorName,
      search,
      lue: lue === 'true' ? true : lue === 'false' ? false : undefined,
    });
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

  @Patch(':id/unread')
  markAsUnread(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationService.markAsUnread(id);
  }

  @Patch('read-all')
  markAllAsRead() {
    return this.notificationService.markAllAsRead();
  }
}
