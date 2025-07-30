import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      userId,
      clientName,
      comment,
      details, // Array de { productId, quantity, price }
      payments, // Array de { paymentTypeId, amount }
      totalPaid,
      change,
    } = body;

    // Validaciones básicas
    if (!userId || !details || details.length === 0 || !payments || payments.length === 0) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios: userId, details y payments" },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Verificar que todos los tipos de pago existen y están activos
    const paymentTypeIds = payments.map((p: any) => p.paymentTypeId);
    const paymentTypes = await prisma.paymentType.findMany({
      where: {
        id: { in: paymentTypeIds },
        active: true
      }
    });

    if (paymentTypes.length !== paymentTypeIds.length) {
      return NextResponse.json(
        { error: "Uno o más tipos de pago no válidos o inactivos" },
        { status: 404 }
      );
    }

    // Obtener información de todos los productos
    const productIds = details.map((detail: any) => detail.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        active: true
      }
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: "Uno o más productos no existen o están inactivos" },
        { status: 404 }
      );
    }

    // Crear un mapa de productos para fácil acceso
    const productsMap = new Map(products.map(p => [p.id, p]));

    // Preparar detalles de venta con validación
    const saleDetailsData = details.map((detail: any) => {
      const product = productsMap.get(detail.productId);
      if (!product) {
        throw new Error(`Producto con ID ${detail.productId} no encontrado`);
      }

      const quantity = Number(detail.quantity);
      const price = Number(detail.price) || product.price;
      const subtotal = quantity * price;

      if (quantity <= 0) {
        throw new Error(`La cantidad debe ser mayor a 0 para el producto ${product.name}`);
      }

      return {
        productId: product.id,
        quantity,
        price,
        subtotal,
        productName: product.name,
        productDescription: product.description,
        unitsPerPackage: product.unitsPerPackage,
        productImage: product.image,
      };
    });

    // Calcular total
   const total = saleDetailsData.reduce((sum: number, detail: any) => sum + detail.subtotal, 0);

    // Validar que el total pagado sea correcto
    const calculatedTotalPaid = payments.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0);
    
    if (Math.abs(calculatedTotalPaid - totalPaid) > 0.01) {
      return NextResponse.json(
        { error: "El total pagado no coincide con la suma de los pagos" },
        { status: 400 }
      );
    }

    if (totalPaid < total) {
      return NextResponse.json(
        { error: "El monto pagado es insuficiente" },
        { status: 400 }
      );
    }

    // Para pagos múltiples, usamos el primer tipo de pago como principal
    const mainPaymentTypeId = payments[0].paymentTypeId;

    // Obtener fecha actual en Lima
    const limaNow = dayjs().tz("America/Lima").toDate();

    // Crear la nota de venta con sus detalles en una transacción
    const saleNote = await prisma.saleNote.create({
      data: {
        userId,
        paymentTypeId: mainPaymentTypeId,
        clientName: clientName || null,
        comment: comment || null,
        total,
        totalPaid,
        change: change || 0,
        paymentDetails: JSON.stringify(payments), // Guardamos los detalles de pago como JSON
        createdAt: limaNow, // Guardar con hora de Perú
        details: {
          create: saleDetailsData
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        paymentType: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        details: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                image: true,
                price: true,
                unitsPerPackage: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      saleNote,
      message: "Nota de venta creada exitosamente"
    });

  } catch (error) {
    console.error("Error al crear nota de venta:", error);
    return NextResponse.json(
      { 
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}

// ...existing GET function...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parámetros de consulta
    const page = Number(searchParams.get("page") || "1");
    const pageSize = Number(searchParams.get("pageSize") || "10");
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    const paymentTypeId = searchParams.get("paymentTypeId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Construir filtros
    const where: any = {};

    if (userId) {
      where.userId = Number(userId);
    }

    if (status) {
      where.status = status;
    }

    if (paymentTypeId) {
      where.paymentTypeId = Number(paymentTypeId);
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Obtener notas de venta con paginación
    const [saleNotes, total] = await Promise.all([
      prisma.saleNote.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          paymentType: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          details: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  image: true,
                  price: true,
                  unitsPerPackage: true
                }
              }
            }
          }
        }
      }),
      prisma.saleNote.count({ where })
    ]);

    return NextResponse.json({
      saleNotes,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });

  } catch (error) {
    console.error("Error al obtener notas de venta:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}