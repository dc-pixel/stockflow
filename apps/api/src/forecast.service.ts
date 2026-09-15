import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export type ForecastPoint = { date: string; demand: number; kind: 'HISTORICAL' | 'FORECAST' };

@Injectable()
export class ForecastService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Baseline forecast: weighted moving average over daily fulfilled sales.
   * Weights increase toward recent observations so the model adapts to trend changes.
   */
  static weightedMovingAverage(values: number[], window = 28): number {
    const sample = values.slice(-window);
    if (sample.length === 0) return 0;
    let weighted = 0;
    let weightSum = 0;
    sample.forEach((value, index) => {
      const weight = index + 1;
      weighted += value * weight;
      weightSum += weight;
    });
    return weightSum === 0 ? 0 : weighted / weightSum;
  }

  static reorderRecommendation(input: {
    availableStock: number;
    inboundStock: number;
    reservedStock: number;
    averageDailyDemand: number;
    demandStdDev: number;
    leadTimeDays: number;
    targetDays?: number;
  }) {
    const leadDemand = input.averageDailyDemand * input.leadTimeDays;
    const safetyStock = Math.ceil(1.65 * input.demandStdDev * Math.sqrt(Math.max(input.leadTimeDays, 1)));
    const reorderPoint = Math.ceil(leadDemand + safetyStock);
    const targetStock = Math.ceil(input.averageDailyDemand * (input.targetDays ?? Math.max(input.leadTimeDays * 2, 30)) + safetyStock);
    const projectedAvailable = input.availableStock + input.inboundStock - input.reservedStock;
    const recommendedOrderQuantity = Math.max(0, targetStock - projectedAvailable);

    return { leadDemand, safetyStock, reorderPoint, projectedAvailable, targetStock, recommendedOrderQuantity };
  }

  async generate(organizationId: string, productId: string, horizonDays = 30) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, organizationId, isActive: true } });
    if (!product) throw new Error('Product not found');

    const movements = await this.prisma.stockMovement.findMany({
      where: { organizationId: undefined, productId, type: 'SALE' },
      orderBy: { createdAt: 'asc' },
      select: { quantity: true, createdAt: true },
    });

    const daily = new Map<string, number>();
    for (const movement of movements) {
      const key = movement.createdAt.toISOString().slice(0, 10);
      daily.set(key, (daily.get(key) ?? 0) + movement.quantity);
    }
    const historical = [...daily.values()];
    const avg = ForecastService.weightedMovingAverage(historical);
    const mean = historical.length ? historical.reduce((a, b) => a + b, 0) / historical.length : 0;
    const variance = historical.length ? historical.reduce((sum, value) => sum + (value - mean) ** 2, 0) / historical.length : 0;
    const stdDev = Math.sqrt(variance);
    const inventory = await this.prisma.inventory.findMany({ where: { productId }, select: { quantity: true, reservedQuantity: true } });
    const available = inventory.reduce((sum, row) => sum + row.quantity, 0);
    const reserved = inventory.reduce((sum, row) => sum + row.reservedQuantity, 0);
    const inbound = await this.prisma.purchaseOrderItem.aggregate({
      where: { productId, purchaseOrder: { organizationId, status: { in: ['SUBMITTED', 'CONFIRMED', 'PARTIALLY_RECEIVED'] } } },
      _sum: { quantity: true },
    });
    const inboundStock = inbound._sum.quantity ?? 0;
    const recommendation = ForecastService.reorderRecommendation({
      availableStock: available,
      inboundStock,
      reservedStock: reserved,
      averageDailyDemand: avg,
      demandStdDev: stdDev,
      leadTimeDays: product.leadTimeDays,
    });

    const points: ForecastPoint[] = historical.map((demand, index) => ({ date: `${index}`, demand, kind: 'HISTORICAL' }));
    for (let day = 1; day <= horizonDays; day += 1) points.push({ date: `+${day}`, demand: Math.max(0, Math.round(avg)), kind: 'FORECAST' });

    return this.prisma.forecast.create({
      data: {
        organizationId,
        productId,
        method: 'WEIGHTED_MOVING_AVERAGE',
        horizonDays,
        points,
        averageDailyDemand: avg,
        safetyStock: recommendation.safetyStock,
        reorderPoint: recommendation.reorderPoint,
        recommendedOrderQuantity: recommendation.recommendedOrderQuantity,
      },
    });
  }
}
