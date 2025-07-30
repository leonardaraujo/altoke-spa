import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Elimina todos los usuarios existentes
  await prisma.user.deleteMany();

  // Elimina todos los métodos de pago existentes
  await prisma.paymentType.deleteMany();

  // Hashea las contraseñas
  const passwordJuan = await bcrypt.hash('123456', 10);
  const passwordAna = await bcrypt.hash('123456', 10);

  // Inserta nuevos usuarios con rol y contraseña hasheada
  await prisma.user.createMany({
    data: [
      { name: 'Juan', email: 'juan@email.com', password: passwordJuan, role: 'admin' },
      { name: 'Ana', email: 'ana@email.com', password: passwordAna, role: 'seller' },
    ],
  });

  // Inserta métodos de pago
  await prisma.paymentType.createMany({
    data: [
      { name: 'Cash', description: 'Pago en efectivo', active: true },
      { name: 'Yape', description: 'Pago con Yape', active: true },
      { name: 'Tarjeta de crédito o débito', description: 'Pago con tarjeta', active: true },
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