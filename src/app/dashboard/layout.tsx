"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, BarChart2, Calendar, TrendingUp, Package, ShoppingCart, Home } from "lucide-react";
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Cierra el sidebar en móviles al cambiar de ruta
  useEffect(() => {
    if (open) setOpen(false);
    // eslint-disable-next-line
  }, [pathname]);

  // Navegación con cierre de sidebar en móvil
  const handleNav = (href: string) => {
    router.push(href);
    setOpen(false);
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
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-600 rounded-lg flex items-center justify-center">
              <BarChart2 className="text-white" size={22} />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">Altoke POS</h2>
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
        <nav className="flex flex-col p-4 md:p-6 space-y-2">
      {/* Botón Home */}
          <button
            onClick={() => handleNav("/dashboard")}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              pathname === "/dashboard"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
            }`}
          >
            <Home size={20} />
            Inicio
          </button>

          <button
            onClick={() => handleNav("/dashboard/daily")}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              pathname === "/dashboard/daily"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
            }`}
          >
            <Calendar size={20} />
            Ventas por día
          </button> 
          <button
            onClick={() => handleNav("/dashboard/manage-products")}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              pathname === "/dashboard/manage-products"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
            }`}
          >
            <Package size={20} />
            Gestión de productos
          </button>
                    <button
            onClick={() => handleNav("/pos")}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              pathname === "/pos"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
            }`}
          >
            <ShoppingCart size={20} />
            Ir a punto de venta
          </button>
        </nav>
        {/* Footer del sidebar */}
        <div className="mt-auto p-4 md:p-6 border-t border-gray-100">
          <div className="text-center">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <BarChart2 className="text-white" size={24} />
            </div>
            <h3 className="font-bold text-gray-800 text-base md:text-lg">Altoke POS</h3>
            <p className="text-xs text-gray-500">Dashboard de ventas</p>
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
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-600 rounded-lg flex items-center justify-center">
              <BarChart2 className="text-white" size={16} />
            </div>
            <span className="text-lg font-bold text-gray-800">Altoke POS</span>
          </div>
        </div>
        <div className="p-2 sm:p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}