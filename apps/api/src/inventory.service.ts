import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { StockMovementType } from '@prisma/client';

export type InventoryStatus = 'IN_STOCK' | 'LOW_STOCK' | 'CRITICAL' | 'OUT_OF_STOCK' | 'OVERSTOCKED';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async adjust(input: { organizationId: string; productId: string; warehouseId: string; quantityDelta: number; type: StockMovementType; userId?: string; referenceType?: string; referenceId?: string; notes?: string; }) {
    if (!Number.isInteger(input.quantityDelta) || input.quantityDelta === 0) throw new BadRequestException('quantityDelta must be a non-zero integer');
    return this.prisma.$transaction(async (tx: any) => {
      const product = await tx.product.findFirst({ where: { id: input.productId, organizationId: input.organizationId, isActive: true } });
      if (!product) throw new NotFoundException('Product not found');
      const warehouse = await tx.warehouse.findFirst({ where: { id: input.warehouseId, organizationId: input.organizationId } });
      if (!warehouse) throw new NotFoundException('Warehouse not found');
      const existing = await tx.inventory.findUnique({ where: { productId_warehouseId: { productId: input.productId, warehouseId: input.warehouseId } } });
      const previousQuantity = existing?.quantity ?? 0;
      const reservedQuantity = existing?.reservedQuantity ?? 0;
      const newQuantity = previousQuantity + input.quantityDelta;
      if (newQuantity < 0) throw new BadRequestException('INSUFFICIENT_STOCK');
      if (newQuantity < reservedQuantity) throw new BadRequestException('Stock cannot fall below reserved quantity');
      const inventory = await tx.inventory.upsert({ where: { productId_warehouseId: { productId: input.productId, warehouseId: input.warehouseId } }, create: { productId: input.productId, warehouseId: input.warehouseId, quantity: newQuantity, reservedQuantity }, update: { quantity: newQuantity } });
      const movement = await tx.stockMovement.create({ data: { productId: input.productId, warehouseId: input.warehouseId, type: input.type, quantity: Math.abs(input.quantityDelta), referenceType: input.referenceType, referenceId: input.referenceId, previousQuantity, newQuantity, userId: input.userId, notes: input.notes } });
      await tx.auditLog.create({ data: { organizationId: input.organizationId, userId: input.userId, action: 'INVENTORY_ADJUSTED', entityType: 'Inventory', entityId: inventory.id, before: { quantity: previousQuantity, reservedQuantity }, after: { quantity: newQuantity, reservedQuantity } } });
      return { inventory, movement };
    });
  }

  static status(quantity: number, reorderPoint: number, minimumStock: number, maximumStock?: number | null): InventoryStatus {
    if (quantity <= 0) return 'OUT_OF_STOCK';
    if (maximumStock != null && quantity > maximumStock) return 'OVERSTOCKED';
    if (quantity <= minimumStock) return 'CRITICAL';
    if (quantity <= reorderPoint) return 'LOW_STOCK';
    return 'IN_STOCK';
  }
}
