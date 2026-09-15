import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaService } from './prisma.service';
import { InventoryService } from './inventory.service';
import { ForecastService } from './forecast.service';

@Module({ controllers: [AppController], providers: [PrismaService, InventoryService, ForecastService], exports: [PrismaService, InventoryService, ForecastService] })
export class AppModule {}
