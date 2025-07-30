"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  X,
  ShoppingCart,
  Package,
  CreditCard,
  LogOut,
  BarChart2,
  Printer,
} from "lucide-react";
import { useUserStore } from "@/store/userStore";
import usePrinterStore from "@/store/printerStore";
import { connectToPrinter } from "@/utils/printerUtils";

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const logout = useUserStore((state) => state.logout);
  const user = useUserStore((state) => state.user);
  const loadFromStorage = useUserStore((state) => state.loadFromStorage);

  // Estado de la impresora desde el store
  const printerState = usePrinterStore((state) => state.printerState);

  // Hidrata el usuario desde localStorage al montar el layout
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  // Botón flotante para conectar impresora
  const handleConnectPrinter = async () => {
    try {
      await connectToPrinter();
    } catch (err) {
      // Puedes mostrar un toast si quieres feedback adicional
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-72 bg-white shadow-xl flex flex-col z-40
          transition-transform duration-300 border-r border-gray-200
          ${open ? "translate-x-0" : "-translate-x-full"}
          md:static md:translate-x-0 md:flex
        `}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
              <CreditCard className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Altoke</h2>
              <p className="text-sm text-gray-600 font-medium">POS</p>
            </div>
          </div>
          {/* Botón cerrar solo en móviles */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex flex-col p-6 space-y-2">
          <a
            href="/pos"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 text-blue-600 font-medium transition-colors"
          >
            <ShoppingCart size={20} />
            Punto de Venta
          </a>
          <a
            href="/pos/historial"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-800 font-medium transition-colors"
          >
            <Package size={20} />
            Historial de Ventas
          </a>
          {user?.role === "admin" && (
            <a
              href="/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-800 font-medium transition-colors"
            >
              <BarChart2 size={20} />
              Ir a Dashboard
            </a>
          )}
        </nav>

        {/* Footer del sidebar */}
        <div className="mt-auto p-6 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-50 text-red-600 font-medium hover:bg-red-100 transition-colors"
          >
            <LogOut size={20} />
            Cerrar sesión
          </button>
          <div className="text-center mt-6">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <CreditCard className="text-white" size={24} />
            </div>
            <h3 className="font-bold text-gray-800">Altoke POS</h3>
            <p className="text-xs text-gray-500">Sistema de Punto de Venta</p>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 md:hidden backdrop-blur-sm bg-black/20"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Contenido principal */}
      <main className="flex-1 md:ml-0">
        {/* Header móvil */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white shadow-sm border-b border-gray-200">
          <button
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
              <CreditCard className="text-white" size={16} />
            </div>
            <div>
              <span className="text-lg font-bold text-gray-800">Altoke</span>
              <span className="text-sm text-gray-600 ml-1">POS</span>
            </div>
          </div>
        </div>
        {children}

        {/* Botón flotante de impresora */}
        <button
          onClick={handleConnectPrinter}
          className={`
            fixed z-50 bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg
            font-semibold transition-colors
            ${printerState
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-gray-200 text-gray-700 hover:bg-blue-500 hover:text-white"}
          `}
          title={printerState ? "Impresora conectada" : "Conectar impresora"}
        >
          <Printer size={22} className={printerState ? "animate-pulse" : ""} />
          {printerState ? "Impresora conectada" : "Conectar impresora"}
        </button>
      </main>
    </div>
  );
} 