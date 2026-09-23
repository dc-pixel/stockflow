import { describe, expect, it } from 'vitest';
import { InventoryService } from './inventory.service';

describe('InventoryService.status', () => {
  it('reports out-of-stock before other thresholds', () => {
    expect(InventoryService.status(0, 10, 5)).toBe('OUT_OF_STOCK');
    expect(InventoryService.status(-1, 10, 5)).toBe('OUT_OF_STOCK');
  });

  it('prioritizes overstock and then stock thresholds', () => {
    expect(InventoryService.status(21, 10, 5, 20)).toBe('OVERSTOCKED');
    expect(InventoryService.status(5, 10, 5)).toBe('CRITICAL');
    expect(InventoryService.status(10, 10, 5)).toBe('LOW_STOCK');
    expect(InventoryService.status(11, 10, 5)).toBe('IN_STOCK');
  });
});
