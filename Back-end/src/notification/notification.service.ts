import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { TypeNotification } from '@prisma/client';

export interface NotificationActor {
  id: string;
  nom: string;
  role: string;
}

@Injectable()
export class NotificationService {
  constructor(private readonly db: DatabaseService) {}

  /** Create a notification (called from other services) */
  async create(type: TypeNotification, message: string, actor?: NotificationActor) {
    return this.db.notification.create({
      data: {
        type,
        message,
        ...(actor && {
          actorId: actor.id,
          actorName: actor.nom,
          actorRole: actor.role,
        }),
      },
    });
  }

  /** List recent notifications (newest first, max 50) */
  async findAll() {
    return this.db.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /** Paginated notifications with filters */
  async findAllPaginated(params: {
    page?: number;
    limit?: number;
    type?: TypeNotification;
    actorName?: string;
    search?: string;
    lue?: boolean;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.type) where.type = params.type;
    if (params.lue !== undefined) where.lue = params.lue;
    if (params.actorName) {
      where.actorName = { contains: params.actorName, mode: 'insensitive' };
    }
    if (params.search) {
      where.message = { contains: params.search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.notification.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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

  /** Mark a single notification as unread */
  async markAsUnread(id: string) {
    return this.db.notification.update({
      where: { id },
      data: { lue: false },
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
