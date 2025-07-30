"use client";
import { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import dayjs from "dayjs";
import { Calendar, TrendingUp, Users, CreditCard, Package, DollarSign } from "lucide-react";

type ProductoMasVendido = {
  id: number;
  nombre: string;
  cantidadPacks: number;
  unidadesIndividuales: number;
  unitsPerPackage: number;
};

type ProductoVendido = {
  id: number;
  nombre: string;
  cantidadPacks: number;
  unidadesIndividuales: number;
  unitsPerPackage: number;
  monto: number;
};

type Stats = {
  totalVendido: number;
  cantidadVentas: number;
  productoMasVendido: ProductoMasVendido | null;
  pagosPorTipo: Record<string, number>;
  productosVendidos?: ProductoVendido[];
  totalProductosVendidos?: number;
  totalUnidadesIndividuales?: number;
  totalEfectivoProductos?: number;
  rango: { inicio: string; fin: string };
};

const minDate = process.env.NEXT_PUBLIC_MIN_DATE || "2024-01-01";

export default function DailyStatsPage() {
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    fetch(`/api/stats?date=${dayjs(selected).format("YYYY-MM-DD")}`)
      .then(res => res.json())
      .then(data => setStats(data))
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Calendar className="text-blue-600" size={32} />
            Ventas por Día
          </h1>
          <p className="text-gray-600 mt-1">
            Selecciona una fecha para ver las estadísticas de ventas
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendario */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Calendar size={18} />
                Seleccionar fecha
              </h2>
              <div className="flex justify-center">
                <DayPicker
                  mode="single"
                  selected={selected}
                  onSelect={setSelected}
                  hidden={{
                    before: dayjs(minDate).toDate(),
                    after: new Date(),
                  }}
                  captionLayout="dropdown"
                  className="rdp-small"
                  styles={{
                    root: { fontSize: '14px' },
                    months: { width: '100%' },
                    month: { width: '100%' },
                    table: { width: '100%', maxWidth: '280px' },
                  }}
                />
              </div>
            </div>
          </div>

          {/* Estadísticas principales */}
          <div className="lg:col-span-2">
            {loading || !stats ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600">Cargando estadísticas...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Cards de resumen */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm">Total vendido</p>
                        <p className="text-2xl font-bold">S/{stats.totalVendido.toFixed(2)}</p>
                      </div>
                      <DollarSign size={32} className="text-green-200" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">Clientes atendidos</p>
                        <p className="text-2xl font-bold">{stats.cantidadVentas}</p>
                      </div>
                      <Users size={32} className="text-blue-200" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm">Unidades vendidas</p>
                        <p className="text-2xl font-bold">{stats.totalUnidadesIndividuales || 0}</p>
                        <p className="text-purple-200 text-xs">
                          ({stats.totalProductosVendidos || 0} productos)
                        </p>
                      </div>
                      <Package size={32} className="text-purple-200" />
                    </div>
                  </div>
                </div>

                {/* Producto más vendido */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <TrendingUp size={18} className="text-orange-500" />
                    Producto más vendido
                  </h3>
                  <div className="text-lg">
                    {stats.productoMasVendido ? (
                      <div>
                        <span className="font-medium text-gray-700">
                          {stats.productoMasVendido.nombre}
                        </span>
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="text-orange-600 font-bold">
                            {stats.productoMasVendido.cantidadPacks} {stats.productoMasVendido.unitsPerPackage > 1 ? 'packs' : 'unidades'}
                          </span>
                          {stats.productoMasVendido.unitsPerPackage > 1 && (
                            <span className="ml-2">
                              = <span className="text-blue-600 font-bold">{stats.productoMasVendido.unidadesIndividuales} unidades individuales</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500">Sin ventas registradas</span>
                    )}
                  </div>
                </div>

                {/* Métodos de pago */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <CreditCard size={18} className="text-blue-500" />
                    Métodos de pago
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(stats.pagosPorTipo).map(([tipo, monto]) => (
                      <div key={tipo} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">{tipo}</span>
                        <span className="text-blue-600 font-bold">S/{monto.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lista de productos vendidos */}
        {stats && stats.productosVendidos && stats.productosVendidos.length > 0 && (
          <div className="mt-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                  <Package className="text-green-600" size={24} />
                  Detalle de productos vendidos
                </h2>
              </div>

              {/* Vista desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Producto
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cantidad vendida
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unidades individuales
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monto vendido
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.productosVendidos.map((prod) => (
                      <tr key={prod.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{prod.nombre}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {prod.cantidadPacks} {prod.unitsPerPackage > 1 ? 'packs' : 'unidades'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-medium text-purple-600">
                            {prod.unidadesIndividuales}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                          S/{prod.monto.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vista móvil */}
              <div className="md:hidden">
                {stats.productosVendidos.map((prod) => (
                  <div key={prod.id} className="p-4 border-b border-gray-200 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{prod.nombre}</h3>
                        <div className="mt-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {prod.cantidadPacks} {prod.unitsPerPackage > 1 ? 'packs' : 'unidades'}
                            </span>
                            <span className="text-xs text-purple-600 font-medium">
                              = {prod.unidadesIndividuales} unidades
                            </span>
                          </div>
                          <span className="text-lg font-bold text-gray-900">
                            S/{prod.monto.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Resumen final */}
              <div className="bg-gray-50 px-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="text-gray-600">
                    <span className="font-semibold">Total productos:</span>{" "}
                    <span className="text-blue-700 font-bold">{stats.totalProductosVendidos}</span>
                  </div>
                  <div className="text-gray-600">
                    <span className="font-semibold">Total unidades:</span>{" "}
                    <span className="text-purple-700 font-bold">{stats.totalUnidadesIndividuales}</span>
                  </div>
                  <div className="text-gray-600">
                    <span className="font-semibold">Total efectivo:</span>{" "}
                    <span className="text-green-700 font-bold">
                      S/{(stats.totalEfectivoProductos ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Información del rango */}
        {stats && (
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              Datos del {dayjs(stats.rango.inicio).format("DD/MM/YYYY HH:mm")} al {dayjs(stats.rango.fin).format("DD/MM/YYYY HH:mm")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}