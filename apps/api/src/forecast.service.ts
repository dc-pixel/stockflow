import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export type ForecastPoint = { date: string; demand: number; kind: 'HISTORICAL' | 'FORECAST' };

type InventoryRow = { quantity: number; reservedQuantity: number };

@Injectable()
export class ForecastService {
  constructor(private readonly prisma: PrismaService) {}

  static weightedMovingAverage(values: number[], window = 28): number {
    const sample = values.slice(-window);
    if (!sample.length) return 0;
    let weighted = 0;
    let weightSum = 0;
    sample.forEach((value, index) => { const weight = index + 1; weighted += value * weight; weightSum += weight; });
    return weightSum ? weighted / weightSum : 0;
  }

  static reorderRecommendation(input: { availableStock: number; inboundStock: number; reservedStock: number; averageDailyDemand: number; demandStdDev: number; leadTimeDays: number; targetDays?: number; }) {
    const leadDemand = input.averageDailyDemand * input.leadTimeDays;
    const safetyStock = Math.ceil(1.65 * input.demandStdDev * Math.sqrt(Math.max(input.leadTimeDays, 1)));
    const reorderPoint = Math.ceil(leadDemand + safetyStock);
    const targetStock = Math.ceil(input.averageDailyDemand * (input.targetDays ?? Math.max(input.leadTimeDays * 2, 30)) + safetyStock);
    const projectedAvailable = input.availableStock + input.inboundStock - input.reservedStock;
    return { leadDemand, safetyStock, reorderPoint, projectedAvailable, targetStock, recommendedOrderQuantity: Math.max(0, targetStock - projectedAvailable) };
  }

  async generate(organizationId: string, productId: string, horizonDays = 30) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, organizationId, isActive: true } });
    if (!product) throw new Error('Product not found');
    const movements = await this.prisma.stockMovement.findMany({ where: { productId, type: 'SALE', product: { organizationId } }, orderBy: { createdAt: 'asc' }, select: { quantity: true, createdAt: true } });
    const daily = new Map<string, number>();
    movements.forEach((movement: { quantity: number; createdAt: Date }) => { const key = movement.createdAt.toISOString().slice(0, 10); daily.set(key, (daily.get(key) ?? 0) + movement.quantity); });
    const historical = [...daily.values()];
    const avg = ForecastService.weightedMovingAverage(historical);
    const mean = historical.length ? historical.reduce((a: number, b: number) => a + b, 0) / historical.length : 0;
    const variance = historical.length ? historical.reduce((sum: number, value: number) => sum + (value - mean) ** 2, 0) / historical.length : 0;
    const inventory = await this.prisma.inventory.findMany({ where: { productId, product: { organizationId } }, select: { quantity: true, reservedQuantity: true } });
    const rows: InventoryRow[] = inventory;
    const available = rows.reduce((sum: number, row: InventoryRow) => sum + row.quantity, 0);
    const reserved = rows.reduce((sum: number, row: InventoryRow) => sum + row.reservedQuantity, 0);
    const inbound = await this.prisma.purchaseOrderItem.aggregate({ where: { productId, purchaseOrder: { organizationId, status: { in: ['SUBMITTED', 'CONFIRMED', 'PARTIALLY_RECEIVED'] } } }, _sum: { quantity: true } });
    const recommendation = ForecastService.reorderRecommendation({ availableStock: available, inboundStock: inbound._sum.quantity ?? 0, reservedStock: reserved, averageDailyDemand: avg, demandStdDev: Math.sqrt(variance), leadTimeDays: product.leadTimeDays });
    const points: ForecastPoint[] = historical.map((demand: number, index: number) => ({ date: `${index}`, demand, kind: 'HISTORICAL' }));
    for (let day = 1; day <= horizonDays; day += 1) points.push({ date: `+${day}`, demand: Math.max(0, Math.round(avg)), kind: 'FORECAST' });
    return this.prisma.forecast.create({ data: { organizationId, productId, method: 'WEIGHTED_MOVING_AVERAGE', horizonDays, points, averageDailyDemand: avg, safetyStock: recommendation.safetyStock, reorderPoint: recommendation.reorderPoint, recommendedOrderQuantity: recommendation.recommendedOrderQuantity } });
  }
}
