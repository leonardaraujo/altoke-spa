import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, SaleNoteStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const idNumber = Number(params.id);
    if (isNaN(idNumber)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const { status } = await request.json();

    if (!status || !["ACTIVE", "CANCELLED"].includes(status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const updated = await prisma.saleNote.update({
      where: { id: idNumber },
      data: { status: status as SaleNoteStatus },
    });

    return NextResponse.json({ success: true, saleNote: updated });
  } catch (error) {
    console.error("Error al actualizar estado de la boleta:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}