"use client";
import { DollarSign, ShoppingCart, Package, TrendingUp, Eye } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type DashboardStats = {
  ventasHoy: {
    total: number;
    cantidad: number;
  };
  productosActivos: number;
  ultimasVentas: Array<{
    id: number;
    fecha: string;
    total: number;
    productos: Array<{
      nombre: string;
      cantidad: number;
    }>;
  }>;
  productoMasVendido: {
    nombre: string;
    cantidad: number;
  } | null;
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Obtener estadísticas de hoy
        const today = new Date().toISOString().split('T')[0];
        const [statsRes, productsRes, salesRes] = await Promise.all([
          fetch(`/api/stats?date=${today}`),
          fetch('/api/products/all?pageSize=1000'),
          fetch('/api/salenote/last')
        ]);

        const statsData = await statsRes.json();
        const productsData = await productsRes.json();
        const salesData = await salesRes.json();

        setStats({
          ventasHoy: {
            total: statsData.totalVendido || 0,
            cantidad: statsData.cantidadVentas || 0
          },
          productosActivos: productsData.products?.filter((p: any) => p.active).length || 0,
          ultimasVentas: salesData.ventas?.slice(0, 3).map((v: any) => ({
            id: v.id,
            fecha: new Date(v.fecha).toLocaleTimeString('es-PE', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            total: v.total,
            productos: v.productos.slice(0, 2) // Solo los primeros 2 productos
          })) || [],
          productoMasVendido: statsData.productoMasVendido ? {
            nombre: statsData.productoMasVendido.nombre,
            cantidad: statsData.productoMasVendido.unidadesIndividuales
          } : null
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-300 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-300 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            ¡Bienvenido al Dashboard!
          </h1>
          <p className="text-gray-600">Resumen de tu negocio hoy</p>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Ventas de hoy</p>
                <p className="text-2xl font-bold">S/{stats?.ventasHoy.total.toFixed(2) || '0.00'}</p>
                <p className="text-green-200 text-xs">{stats?.ventasHoy.cantidad || 0} ventas</p>
              </div>
              <DollarSign size={32} className="text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Clientes atendidos</p>
                <p className="text-2xl font-bold">{stats?.ventasHoy.cantidad || 0}</p>
                <p className="text-blue-200 text-xs">Hoy</p>
              </div>
              <ShoppingCart size={32} className="text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Productos activos</p>
                <p className="text-2xl font-bold">{stats?.productosActivos || 0}</p>
                <p className="text-purple-200 text-xs">Disponibles</p>
              </div>
              <Package size={32} className="text-purple-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Más vendido hoy</p>
                <p className="text-lg font-bold truncate">
                  {stats?.productoMasVendido?.nombre || 'Sin ventas'}
                </p>
                <p className="text-orange-200 text-xs">
                  {stats?.productoMasVendido?.cantidad || 0} unidades
                </p>
              </div>
              <TrendingUp size={32} className="text-orange-200" />
            </div>
          </div>
        </div>

        {/* Últimas ventas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Eye className="text-blue-600" size={20} />
              Últimas ventas
            </h2>
            <div className="space-y-3">
              {stats?.ultimasVentas && stats.ultimasVentas.length > 0 ? (
                stats.ultimasVentas.map((venta) => (
                  <div key={venta.id} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">{venta.fecha}</span>
                        <span className="font-bold text-green-600">S/{venta.total.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {venta.productos.map((p, i) => (
                          <span key={i}>
                            {p.nombre} ({p.cantidad})
                            {i < venta.productos.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                        {venta.productos.length === 2 && '...'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No hay ventas registradas hoy</p>
              )}
            </div>
          </div>

          {/* Accesos rápidos */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Accesos rápidos</h2>
            <div className="space-y-3">
              <Link
                href="/pos"
                className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
              >
                <ShoppingCart className="text-blue-600 group-hover:text-blue-700" size={20} />
                <div>
                  <span className="font-medium text-gray-800">Realizar venta</span>
                  <p className="text-xs text-gray-600">Punto de venta</p>
                </div>
              </Link>

              <Link
                href="/dashboard/manage-products"
                className="flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
              >
                <Package className="text-purple-600 group-hover:text-purple-700" size={20} />
                <div>
                  <span className="font-medium text-gray-800">Gestionar productos</span>
                  <p className="text-xs text-gray-600">Agregar, editar productos</p>
                </div>
              </Link>

              <Link
                href="/dashboard/daily"
                className="flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
              >
                <TrendingUp className="text-green-600 group-hover:text-green-700" size={20} />
                <div>
                  <span className="font-medium text-gray-800">Ver estadísticas</span>
                  <p className="text-xs text-gray-600">Ventas por día</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}