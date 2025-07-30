import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Borra en orden correcto por dependencias
  await prisma.saleDetail.deleteMany();
  await prisma.saleNote.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.paymentType.deleteMany();

  // Hashea las contraseñas
  const passwordAnibal = await bcrypt.hash('123456', 10);
  const passwordCielo = await bcrypt.hash('123456', 10);
  const passwordSonia = await bcrypt.hash('123456', 10);

  // Inserta usuarios
  await prisma.user.createMany({
    data: [
      { name: 'Anibal', email: 'anibal@email.com', password: passwordAnibal, role: 'admin' },
      { name: 'Cielo', email: 'cielo@email.com', password: passwordCielo, role: 'admin' },
      { name: 'Sonia Clemente Guerra', email: 'sonia@email.com', password: passwordSonia, role: 'seller' },
    ],
  });

  // Inserta métodos de pago
  await prisma.paymentType.createMany({
    data: [
      { name: 'Efectivo', description: 'Pago en efectivo', key: 'cash', active: true },
      { name: 'Yape', description: 'Pago con Yape', active: true },
      { name: 'Plin', description: 'Pago con Plin', active: true },
      { name: 'Transferencia BCP', description: 'Transferencia Bancaria BCP', active: true },
      { name: 'Transferencia Scotiabank', description: 'Transferencia Bancaria Scotiabank', active: true },
    ],
  });

  console.log('Seed ejecutado correctamente');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });