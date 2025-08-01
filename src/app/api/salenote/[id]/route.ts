import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const idNumber = Number(id);
    if (isNaN(idNumber)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    const saleNote = await prisma.saleNote.findUnique({
      where: { id: idNumber },
      select: {
        id: true,
        createdAt: true,
        clientName: true,
        comment: true,
        total: true,
        totalPaid: true,
        change: true,
        paymentDetails: true,
        status: true, // <-- Aquí traes el estado
        user: { select: { id: true, name: true, email: true, role: true } },
        paymentType: { select: { id: true, name: true, description: true } },
        details: {
          select: {
            id: true,
            quantity: true,
            price: true,
            subtotal: true,
            productName: true,
            productDescription: true,
            unitsPerPackage: true,
            productImage: true,
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                image: true,
                price: true,
                unitsPerPackage: true,
              },
            },
          },
        },
      },
    });

    if (!saleNote) {
      return NextResponse.json(
        { error: "Nota de venta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ saleNote });
  } catch (error) {
    console.error("Error al obtener nota de venta por ID:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}