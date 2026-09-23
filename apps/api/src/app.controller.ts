import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health() {
    let database = 'connected';
    try { await this.prisma.$queryRaw`SELECT 1`; } catch { database = 'disconnected'; }
    return { status: database === 'connected' ? 'ok' : 'degraded', database, timestamp: new Date().toISOString() };
  }
}
