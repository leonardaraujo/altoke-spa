import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "supersecret"; // Pon esto en tu .env en producción

export async function POST(request: NextRequest) {
  const { email, password, name, action, role } = await request.json();

  if (action === "register") {
    // Registro de usuario
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "El usuario ya existe" }, { status: 400 });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, password: hashed, role: role === "admin" ? "admin" : "seller" },
    });
    return NextResponse.json({ message: "Usuario registrado", user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  }

  // Login de usuario
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  // Genera JWT con rol y expiración de 30 días
  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: "30d" }
  );

  return NextResponse.json({ accessToken: token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}