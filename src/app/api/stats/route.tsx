import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const month = searchParams.get("month");

    const where: any = { status: "ACTIVE" };

    let start: Date, end: Date;
    const lima = "America/Lima";

    if (date) {
      start = dayjs.tz(`${date} 00:00:00`, lima).toDate();
      end = dayjs.tz(`${date} 23:59:59.999`, lima).toDate();
      where.createdAt = { gte: start, lte: end };
    } else if (month) {
      const [year, m] = month.split("-");
      start = dayjs.tz(`${year}-${m}-01 00:00:00`, lima).toDate();
      end = dayjs.tz(`${year}-${m}-01 00:00:00`, lima).endOf("month").toDate();
      where.createdAt = { gte: start, lte: end };
    } else {
      const now = dayjs().tz(lima);
      start = now.startOf("day").toDate();
      end = now.endOf("day").toDate();
      where.createdAt = { gte: start, lte: end };
    }

    // Traer todas las notas de venta activas en el rango
    const saleNotes = await prisma.saleNote.findMany({
      where,
      include: {
        details: true,
        paymentType: true,
      },
    });

    // Total vendido
    const totalVendido = saleNotes.reduce((sum, note) => sum + Number(note.total), 0);

    // Obtener info de productos para saber unitsPerPackage
    const productIds = [...new Set(saleNotes.flatMap(note => note.details.map(det => det.productId)))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, unitsPerPackage: true }
    });
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    // Producto más vendido y productos vendidos con unidades individuales
    const productoCantidad: Record<number, { 
      nombre: string, 
      cantidadPacks: number, 
      unidadesIndividuales: number,
      unitsPerPackage: number 
    }> = {};

    saleNotes.forEach(note => {
      note.details.forEach(det => {
        const product = productMap[det.productId];
        const unitsPerPackage = product?.unitsPerPackage || 1;
        
        if (!productoCantidad[det.productId]) {
          productoCantidad[det.productId] = { 
            nombre: det.productName, 
            cantidadPacks: 0, 
            unidadesIndividuales: 0,
            unitsPerPackage 
          };
        }
        productoCantidad[det.productId].cantidadPacks += det.quantity;
        productoCantidad[det.productId].unidadesIndividuales += det.quantity * unitsPerPackage;
      });
    });

    const productosOrdenados = Object.entries(productoCantidad)
      .sort((a, b) => b[1].unidadesIndividuales - a[1].unidadesIndividuales);
    const productoMasVendido = productosOrdenados.length > 0
      ? { id: Number(productosOrdenados[0][0]), ...productosOrdenados[0][1] }
      : null;

    // Lógica de pagos (igual que antes)
    const pagosPorTipo: Record<string, number> = {};

    saleNotes.forEach(note => {
      let pagos = [];
      if (note.paymentDetails) {
        try {
          pagos = JSON.parse(note.paymentDetails);
        } catch {
          pagos = [{ paymentTypeName: note.paymentType.name, amount: Number(note.total) }];
        }
      } else {
        pagos = [{ paymentTypeName: note.paymentType.name, amount: Number(note.total) }];
      }

      let totalVenta = Number(note.total);
      let totalNoCash = 0;
      let cashKey: string | null = null;

      pagos.forEach((p: any) => {
        const isCash = p.paymentTypeName.toLowerCase().includes("efectivo") || p.paymentTypeName.toLowerCase().includes("cash");
        if (!isCash) {
          const monto = Math.min(Number(p.amount), Math.max(0, totalVenta - totalNoCash));
          pagosPorTipo[p.paymentTypeName] = (pagosPorTipo[p.paymentTypeName] || 0) + monto;
          totalNoCash += monto;
        } else {
          cashKey = p.paymentTypeName;
        }
      });

      if (cashKey) {
        const pagoCash = pagos.find((p: any) => p.paymentTypeName === cashKey);
        let montoCash = Number(pagoCash?.amount || 0);
        const montoCashUsado = Math.max(0, totalVenta - totalNoCash);
        pagosPorTipo[cashKey] = (pagosPorTipo[cashKey] || 0) + Math.min(montoCash, montoCashUsado);
      }
    });

    // Agrupar productos vendidos con info completa
    const productosVendidos: {
      id: number;
      nombre: string;
      cantidadPacks: number;
      unidadesIndividuales: number;
      unitsPerPackage: number;
      monto: number;
    }[] = [];

    Object.entries(productoCantidad).forEach(([id, data]) => {
      let monto = 0;
      saleNotes.forEach(note => {
        note.details.forEach(det => {
          if (det.productId === Number(id)) {
            monto += Number(det.price) * det.quantity;
          }
        });
      });
      productosVendidos.push({
        id: Number(id),
        nombre: data.nombre,
        cantidadPacks: data.cantidadPacks,
        unidadesIndividuales: data.unidadesIndividuales,
        unitsPerPackage: data.unitsPerPackage,
        monto,
      });
    });

    // Totales con unidades individuales
    const totalProductosVendidos = productosVendidos.reduce((sum, p) => sum + p.cantidadPacks, 0);
    const totalUnidadesIndividuales = productosVendidos.reduce((sum, p) => sum + p.unidadesIndividuales, 0);

    // Total en efectivo de productos vendidos
    let totalEfectivoProductos = 0;
    saleNotes.forEach(note => {
      let pagos = [];
      if (note.paymentDetails) {
        try {
          pagos = JSON.parse(note.paymentDetails);
        } catch {
          pagos = [{ paymentTypeName: note.paymentType.name, amount: Number(note.total) }];
        }
      } else {
        pagos = [{ paymentTypeName: note.paymentType.name, amount: Number(note.total) }];
      }
      pagos.forEach((p: any) => {
        const isCash = p.paymentTypeName.toLowerCase().includes("efectivo") || p.paymentTypeName.toLowerCase().includes("cash");
        if (isCash) {
          totalEfectivoProductos += Number(p.amount);
        }
      });
    });

    return NextResponse.json({
      totalVendido,
      cantidadVentas: saleNotes.length,
      productoMasVendido,
      pagosPorTipo,
      productosVendidos,
      totalProductosVendidos,
      totalUnidadesIndividuales,
      totalEfectivoProductos,
      rango: { inicio: start, fin: end }
    });
  } catch (error) {
    console.error("Error en stats:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}