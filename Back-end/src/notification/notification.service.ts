import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { TypeNotification } from '@prisma/client';

@Injectable()
export class NotificationService {
  constructor(private readonly db: DatabaseService) {}

  /** Create a notification (called from other services) */
  async create(type: TypeNotification, message: string) {
    return this.db.notification.create({
      data: { type, message },
    });
  }

  /** List recent notifications (newest first, max 50) */
  async findAll() {
    return this.db.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /** Get count of unread notifications */
  async unreadCount(): Promise<number> {
    return this.db.notification.count({
      where: { lue: false },
    });
  }

  /** Mark a single notification as read */
  async markAsRead(id: string) {
    return this.db.notification.update({
      where: { id },
      data: { lue: true },
    });
  }

  /** Mark all notifications as read */
  async markAllAsRead() {
    return this.db.notification.updateMany({
      where: { lue: false },
      data: { lue: true },
    });
  }
}
