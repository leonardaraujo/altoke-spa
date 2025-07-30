import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const paymentTypes = await prisma.paymentType.findMany({
      where: { active: true },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      paymentTypes
    });
  } catch (error) {
    console.error("Error al obtener tipos de pago:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    const paymentType = await prisma.paymentType.create({
      data: {
        name,
        description: description || null,
        active: true
      }
    });

    return NextResponse.json({
      success: true,
      paymentType,
      message: "Tipo de pago creado exitosamente"
    });

  } catch (error: any) {
    console.error("Error al crear tipo de pago:", error);
    
    // Manejar error de duplicado
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "Ya existe un tipo de pago con ese nombre" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}