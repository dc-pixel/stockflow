import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Demo@123456', 12);
  const org = await prisma.organization.upsert({ where: { id: 'demo-org' }, update: {}, create: { id:'demo-org', name:'StockFlow Demo Company', email:'demo@stockflow.app', currency:'INR', timezone:'Asia/Kolkata' } });
  const user = await prisma.user.upsert({ where:{ email:'demo@stockflow.app' }, update:{ passwordHash }, create:{ name:'Demo Manager', email:'demo@stockflow.app', passwordHash, role:UserRole.OWNER, organizationId:org.id } });
  const warehouse = await prisma.warehouse.upsert({ where:{ id:'demo-warehouse' }, update:{}, create:{ id:'demo-warehouse', organizationId:org.id, name:'Delhi Central', code:'DEL-01', address:'New Delhi, India', managerId:user.id } });
  const category = await prisma.category.upsert({ where:{ id:'demo-category' }, update:{}, create:{ id:'demo-category', organizationId:org.id, name:'Accessories', description:'Computer and mobile accessories' } });
  const supplier = await prisma.supplier.upsert({ where:{ id:'demo-supplier' }, update:{}, create:{ id:'demo-supplier', organizationId:org.id, name:'Northstar Supplies', email:'sales@northstar.example', phone:'+91 90000 00000', contactPerson:'Priya Mehta', rating:4.7, paymentTerms:'Net 30' } });

  const products = [
    ['WM-001','Wireless Mouse',450,799,50,20,190,7,42],
    ['KB-014','Mechanical Keyboard',1800,2999,30,10,120,10,384],
    ['HUB-008','USB-C Hub',950,1699,60,20,180,8,116],
    ['SSD-512','NVMe SSD 512GB',3200,4999,20,8,70,14,8],
    ['CAM-108','1080p Webcam',1200,2199,25,8,80,7,64],
  ] as const;

  for (const [sku,name,cost,sell,reorder,min,reorderQty,lead,stock] of products) {
    const product = await prisma.product.upsert({ where:{ organizationId_sku:{organizationId:org.id,sku} }, update:{ name,costPrice:cost,sellingPrice:sell,reorderPoint:reorder,minimumStock:min,reorderQuantity:reorderQty,leadTimeDays:lead }, create:{ organizationId:org.id,sku,name,categoryId:category.id,supplierId:supplier.id,costPrice:cost,sellingPrice:sell,reorderPoint:reorder,minimumStock:min,reorderQuantity:reorderQty,leadTimeDays:lead } });
    await prisma.inventory.upsert({ where:{ productId_warehouseId:{productId:product.id,warehouseId:warehouse.id} }, update:{quantity:stock}, create:{productId:product.id,warehouseId:warehouse.id,quantity:stock} });

    for (let i=60;i>0;i--) {
      const date = new Date(); date.setDate(date.getDate()-i);
      const qty = Math.max(1, Math.round((name.includes('Mouse')?7:name.includes('Keyboard')?2:name.includes('Hub')?4:1) + ((i*17)%5)-2));
      await prisma.stockMovement.create({ data:{ productId:product.id,warehouseId:warehouse.id,type:'SALE',quantity:qty,previousQuantity:stock,newQuantity:stock,userId:user.id,notes:'Seeded historical sale',createdAt:date } });
    }
  }

  await prisma.alert.create({data:{organizationId:org.id,productId:(await prisma.product.findUniqueOrThrow({where:{organizationId_sku:{organizationId:org.id,sku:'SSD-512'}}})).id,warehouseId:warehouse.id,severity:'CRITICAL',type:'OUT_OF_STOCK_RISK',message:'NVMe SSD 512GB is below its critical stock threshold.'}});
  await prisma.auditLog.create({data:{organizationId:org.id,userId:user.id,action:'SEED_COMPLETED',entityType:'Organization',entityId:org.id,after:{demo:true}}});
  console.log('Seeded StockFlow demo:', user.email);
}

main().finally(()=>prisma.$disconnect());
