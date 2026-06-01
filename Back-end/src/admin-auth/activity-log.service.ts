import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class ActivityLogService {
  constructor(private readonly db: DatabaseService) {}

  async log(adminUserId: string, action: string, details?: unknown, ipAddress?: string, userAgent?: string) {
    try {
      await this.db.activityLog.create({
        data: {
          adminUserId,
          action,
          details: details === undefined ? undefined : (details as any),
          ipAddress,
          userAgent,
        },
      });
    } catch {
      // Activity logs must never block the main user action.
    }
  }

  async list(adminUserId?: string, limit = 50) {
    return this.db.activityLog.findMany({
      where: adminUserId ? { adminUserId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        adminUser: {
          select: {
            username: true,
            nom: true,
            role: true,
          },
        },
      },
    });
  }
}
