import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Role } from '../../generated/prisma/client';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(params: {
    entityType: string;
    entityId: string;
    action: string;
    actorId?: string | null;
    actorRole?: Role | null;
    before?: any;
    after?: any;
    ipAddress?: string | null;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          entityType: params.entityType,
          entityId: params.entityId,
          action: params.action,
          actorId: params.actorId ?? null,
          actorRole: params.actorRole ?? null,
          before: params.before ?? null,
          after: params.after ?? null,
          ipAddress: params.ipAddress ?? null,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to write audit log: ${error}`);
    }
  }
}
