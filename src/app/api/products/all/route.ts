import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const q = searchParams.get("q");
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("pageSize") || "10");
  const active = searchParams.get("active"); // Puede ser "true", "false" o null

  // Filtro dinámico: si se pasa ?active=true o ?active=false, filtra; si no, trae todos
  const where: any = {
    ...(active !== null
      ? { active: active === "true" }
      : {}),
    ...(q
      ? {
          name: {
            contains: q,
            mode: 'insensitive' as const,
          },
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  // Mapea para agregar el campo images a cada producto
  const productosConImagenes = products.map((prod) => {
    const match = prod.image.match(/\/uploads\/(.+)_full\.webp$/);
    const baseName = match ? match[1] : null;
    return {
      ...prod,
      images: baseName
        ? {
            full: `/uploads/${baseName}_full.webp`,
            mid: `/uploads/${baseName}_mid.webp`,
            small: `/uploads/${baseName}_small.webp`,
          }
        : undefined,
    };
  });

  return NextResponse.json({
    products: productosConImagenes,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}