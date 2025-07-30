import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import path from 'path';
import sharp from 'sharp';
import fs from 'fs';

const prisma = new PrismaClient();

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const numId = Number(id);
  if (isNaN(numId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const contentType = request.headers.get("content-type");
    let updateData: any = {};

    // Si es FormData (contiene imagen)
    if (contentType?.includes("multipart/form-data")) {
      const formData = await request.formData();
      
      const name = formData.get('name') as string;
      const description = formData.get('description') as string | null;
      const price = Number(formData.get('price'));
      const unitsPerPackage = formData.get('unitsPerPackage')
        ? Number(formData.get('unitsPerPackage'))
        : null;
      const active = formData.get('active') === "false" ? false : true;
      const isFavorite = formData.get('isFavorite') === "true" ? true : false;
      const file = formData.get('image') as File;

      updateData = {
        name,
        description,
        price,
        unitsPerPackage,
        active,
        isFavorite,
      };

      // Si hay una nueva imagen, procesarla
      if (file && file.size > 0) {
        // Obtener el producto actual para eliminar las imágenes anteriores
        const currentProduct = await prisma.product.findUnique({
          where: { id: numId },
          select: { image: true }
        });

        // Eliminar imágenes anteriores si existen
        if (currentProduct?.image) {
          const match = currentProduct.image.match(/\/uploads\/(.+)_full\.webp$/);
          if (match) {
            const oldBaseName = match[1];
            const uploadDir = path.join(process.cwd(), 'public', 'uploads');
            
            // Lista de archivos a eliminar
            const filesToDelete = [
              `${oldBaseName}_full.webp`,
              `${oldBaseName}_mid.webp`,
              `${oldBaseName}_small.webp`
            ];

            // Eliminar cada archivo si existe
            filesToDelete.forEach(fileName => {
              const filePath = path.join(uploadDir, fileName);
              try {
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath);
                  console.log(`Imagen anterior eliminada: ${fileName}`);
                }
              } catch (error) {
                console.error(`Error al eliminar imagen anterior ${fileName}:`, error);
              }
            });
          }
        }

        // Procesar la nueva imagen
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const baseName = `${Date.now()}_${file.name.split('.')[0]}`;

        // Versiones
        const fullName = `${baseName}_full.webp`;
        const midName = `${baseName}_mid.webp`;
        const smallName = `${baseName}_small.webp`;

        const uploadDir = path.join(process.cwd(), 'public', 'uploads');

        // Crear el directorio si no existe
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

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

        // Actualizar la ruta de la imagen
        updateData.image = `/uploads/${fullName}`;
        
        console.log(`Nuevas imágenes creadas: ${baseName}_[full|mid|small].webp`);
      }
    } else {
      // Si es JSON (sin imagen)
      const body = await request.json();
      updateData = {
        name: body.name,
        description: body.description,
        price: body.price,
        unitsPerPackage: body.unitsPerPackage,
        active: typeof body.active === "boolean" ? body.active : true,
        isFavorite: typeof body.isFavorite === "boolean" ? body.isFavorite : false,
      };
    }
    
    const product = await prisma.product.update({
      where: { id: numId },
      data: updateData,
    });
    
    return NextResponse.json(product);
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    return NextResponse.json({ error: "No se pudo actualizar el producto" }, { status: 500 });
  }
}