import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const saleNotes = await prisma.saleNote.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        user: { select: { id: true, name: true } },
        paymentType: { select: { id: true, name: true } },
        details: {
          include: {
            product: { select: { id: true, name: true, price: true } }
          }
        }
      }
    });

    // Puedes parsear paymentDetails si quieres mostrar los métodos de pago combinados
    const ventas = saleNotes.map(nota => ({
      id: nota.id,
      fecha: nota.createdAt,
      usuario: nota.user?.name,
      total: nota.total,
      totalPagado: nota.totalPaid,
      vuelto: nota.change,
      metodosPago: nota.paymentDetails ? JSON.parse(nota.paymentDetails) : [
        { paymentTypeId: nota.paymentTypeId, paymentTypeName: nota.paymentType?.name, amount: nota.total }
      ],
      productos: nota.details.map(det => ({
        nombre: det.productName,
        cantidad: det.quantity,
        precio: det.price,
        subtotal: det.subtotal
      }))
    }));

    return NextResponse.json({ ventas });
  } catch (error) {
    console.error("Error al obtener últimas ventas:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}