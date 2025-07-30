import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import sharp from 'sharp';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const name = formData.get('name') as string;
  const description = formData.get('description') as string | null;
  const price = Number(formData.get('price'));
  const unitsPerPackage = formData.get('unitsPerPackage')
    ? Number(formData.get('unitsPerPackage'))
    : null;
  const active = formData.get('active') === 'false' ? false : true;
  const isFavorite = formData.get('isFavorite') === 'true' ? true : false; // <-- FAVORITO
  const file = formData.get('image') as File | null;

  if (!name || !price || isNaN(price)) {
    return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
  }

  // Imagen por defecto en /public/static/
  let imagePath: string = '/static/no_image_full.webp';
  let images = {
    full: '/static/no_image_full.webp',
    mid: '/static/no_image_mid.webp',
    small: '/static/no_image_small.webp',
  };

  if (file && file.size > 0) {
    // Procesar imagen con sharp
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const baseName = `${Date.now()}_${file.name.split('.')[0]}`;

    // Versiones
    const fullName = `${baseName}_full.webp`;
    const midName = `${baseName}_mid.webp`;
    const smallName = `${baseName}_small.webp`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');

    // Guardar versión full (ej: 1200px)
    await sharp(buffer)
      .resize({ width: 1200 })
      .webp({ quality: 80 })
      .toFile(path.join(uploadDir, fullName));

    // Guardar versión mid (ej: 600px)
    await sharp(buffer)
      .resize({ width: 600 })
      .webp({ quality: 70 })
      .toFile(path.join(uploadDir, midName));

    // Guardar versión small (ej: 200px)
    await sharp(buffer)
      .resize({ width: 200 })
      .webp({ quality: 60 })
      .toFile(path.join(uploadDir, smallName));

    imagePath = `/uploads/${fullName}`;
    images = {
      full: `/uploads/${fullName}`,
      mid: `/uploads/${midName}`,
      small: `/uploads/${smallName}`,
    };
  }

  // Guardar el producto en la base de datos
  const product = await prisma.product.create({
    data: {
      name,
      description,
      image: imagePath,
      price,
      unitsPerPackage,
      active,
      isFavorite, // <-- FAVORITO
    },
  });

  return NextResponse.json({
    ...product,
    images,
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Búsqueda por palabra clave
  const q = searchParams.get("q");
  // Paginación: SIEMPRE 4 productos por página
  const page = Number(searchParams.get("page") || "1");
  const pageSize = 4;

  // Solo productos activos
  const where: any = {
    active: true,
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
      orderBy: [
    { isFavorite: "desc" }, // <-- FAVORITOS PRIMERO
    { createdAt: "desc" }
  ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  // Mapea para agregar el campo images a cada producto
  const productosConImagenes = products.map((prod) => {
    let match = prod.image?.match(/\/uploads\/(.+)_full\.webp$/);
    let baseName = match ? match[1] : null;

    // Si no tiene imagen personalizada, usar la imagen por defecto en /static/
    if (
      !prod.image ||
      prod.image === '/uploads/no_image.webp' ||
      prod.image === '/static/no_image_full.webp'
    ) {
      return {
        ...prod,
        images: {
          full: '/static/no_image_full.webp',
          mid: '/static/no_image_mid.webp',
          small: '/static/no_image_small.webp',
        },
      };
    }

    return {
      ...prod,
      images: baseName
        ? {
            full: `/uploads/${baseName}_full.webp`,
            mid: `/uploads/${baseName}_mid.webp`,
            small: `/uploads/${baseName}_small.webp`,
          }
        : {
            full: prod.image,
            mid: prod.image,
            small: prod.image,
          },
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