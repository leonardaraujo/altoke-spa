"use client";
import { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import dayjs from "dayjs";
import {
  Calendar,
  TrendingUp,
  Users,
  CreditCard,
  Package,
  DollarSign,
  Eye,
  X,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);
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

type SaleNoteResumen = {
  id: number;
  createdAt: string;
  clientName: string | null;
  total: number;
  totalPaid: number;
  change: number;
  paymentDetails: string;
  user: { name: string };
  paymentType: { name: string };
  status: "ACTIVE" | "CANCELLED";
};

type SaleNoteDetalle = {
  id: number;
  createdAt: string;
  clientName: string | null;
  comment: string | null;
  total: number;
  totalPaid: number;
  change: number;
  paymentDetails: string;
  status: "ACTIVE" | "CANCELLED";
  user: { id: number; name: string; email: string; role: string };
  paymentType: { id: number; name: string; description: string };
  details: Array<{
    id: number;
    quantity: number;
    price: number;
    subtotal: number;
    productName: string;
    productDescription: string;
    unitsPerPackage: number;
    productImage: string;
    product: {
      id: number;
      name: string;
      description: string;
      image: string | null;
      price: number;
      unitsPerPackage: number;
    };
  }>;
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
  const [selected, setSelected] = useState<Date | undefined>(
    dayjs().tz("America/Lima").toDate()
  );
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  // Estados para notas de venta
  const [saleNotes, setSaleNotes] = useState<SaleNoteResumen[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  // Estados para modal de detalle
  const [showDetail, setShowDetail] = useState(false);
  const [detail, setDetail] = useState<SaleNoteDetalle | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // NUEVO: Estados para modal de confirmación
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [cancellingNote, setCancellingNote] = useState(false);

  // Función para obtener métodos de pago de paymentDetails
  const getPaymentMethods = (paymentDetails: string) => {
    try {
      const payments = JSON.parse(paymentDetails);
      if (Array.isArray(payments)) {
        return payments.map((p) => p.paymentTypeName || "N/A").join(", ");
      }
      return "N/A";
    } catch {
      return "N/A";
    }
  };

  // Cargar estadísticas del día
  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    fetch(`/api/stats?date=${dayjs(selected).format("YYYY-MM-DD")}`)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .finally(() => setLoading(false));
  }, [selected]);

  // Cargar notas de venta del día
  useEffect(() => {
    if (!selected) return;
    setLoadingNotes(true);
    const fecha = dayjs(selected).format("YYYY-MM-DD");

    fetch(
      `/api/salenote?startDate=${fecha}&endDate=${fecha}&page=${page}&pageSize=${pageSize}`
    )
      .then((res) => res.json())
      .then((data) => {
        setSaleNotes(data.saleNotes || []);
        setTotalPages(data.pagination?.totalPages || 1);
      })
      .finally(() => setLoadingNotes(false));
  }, [selected, page]);

  // Función para ver detalle de nota de venta
  const handleShowDetail = async (id: number) => {
    setLoadingDetail(true);
    setShowDetail(true);
    try {
      const res = await fetch(`/api/salenote/${id}`);
      const data = await res.json();
      setDetail(data.saleNote || null);
    } catch (error) {
      console.error("Error al cargar detalle:", error);
      setDetail(null);
    }
    setLoadingDetail(false);
  };

  // Función para cerrar modal
  const closeDetail = () => {
    setShowDetail(false);
    setDetail(null);
  };

  // Función para recargar notas de venta
  const reloadSaleNotes = () => {
    if (!selected) return;
    const fecha = dayjs(selected).format("YYYY-MM-DD");
    fetch(
      `/api/salenote?startDate=${fecha}&endDate=${fecha}&page=${page}&pageSize=${pageSize}`
    )
      .then((res) => res.json())
      .then((data) => {
        setSaleNotes(data.saleNotes || []);
      });
  };

  // NUEVA: Función para cancelar nota
  const handleCancelNote = async () => {
    if (!detail) return;

    setCancellingNote(true);
    try {
      const res = await fetch(`/api/salenote/${detail.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });

      if (res.ok) {
        setDetail({ ...detail, status: "CANCELLED" });
        reloadSaleNotes();
        toast.success("Nota de venta cancelada correctamente");
        setShowConfirmCancel(false);
      } else {
        toast.error("No se pudo cancelar la nota de venta");
      }
    } catch (error) {
      toast.error("Error al cancelar la nota de venta");
    }
    setCancellingNote(false);
  };

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
            Selecciona una fecha para ver las estadísticas de ventas y el
            listado de notas de venta
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
                    after: dayjs().tz("America/Lima").toDate(),
                  }}
                  captionLayout="dropdown"
                  className="rdp-small"
                  styles={{
                    root: { fontSize: "14px" },
                    months: { width: "100%" },
                    month: { width: "100%" },
                    table: { width: "100%", maxWidth: "280px" },
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
                  <span className="ml-3 text-gray-600">
                    Cargando estadísticas...
                  </span>
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
                        <p className="text-2xl font-bold">
                          S/{stats.totalVendido.toFixed(2)}
                        </p>
                      </div>
                      <DollarSign size={32} className="text-green-200" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">
                          Clientes atendidos
                        </p>
                        <p className="text-2xl font-bold">
                          {stats.cantidadVentas}
                        </p>
                      </div>
                      <Users size={32} className="text-blue-200" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm">
                          Unidades vendidas
                        </p>
                        <p className="text-2xl font-bold">
                          {stats.totalUnidadesIndividuales || 0}
                        </p>
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
                            {stats.productoMasVendido.cantidadPacks}{" "}
                            {stats.productoMasVendido.unitsPerPackage > 1
                              ? "packs"
                              : "unidades"}
                          </span>
                          {stats.productoMasVendido.unitsPerPackage > 1 && (
                            <span className="ml-2">
                              ={" "}
                              <span className="text-blue-600 font-bold">
                                {stats.productoMasVendido.unidadesIndividuales}{" "}
                                unidades individuales
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500">
                        Sin ventas registradas
                      </span>
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
                      <div
                        key={tipo}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="font-medium text-gray-700">
                          {tipo}
                        </span>
                        <span className="text-blue-600 font-bold">
                          S/{monto.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabla de notas de venta del día */}
        <div className="mt-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                <CreditCard className="text-blue-600" size={24} />
                Notas de venta del día
              </h2>
              {/* Paginación */}
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {"<"}
                </button>
                <span className="text-sm text-gray-600">
                  Página {page} de {totalPages}
                </span>
                <button
                  className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {">"}
                </button>
              </div>
            </div>

            {/* Vista Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Hora
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Usuario
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Métodos pago
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Pagado
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Cambio
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Estado
                    </th>{" "}
                    {/* NUEVA COLUMNA */}
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Ver
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loadingNotes ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="text-center py-6 text-gray-500"
                      >
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                          <span className="ml-2">
                            Cargando notas de venta...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : saleNotes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="text-center py-6 text-gray-500"
                      >
                        No hay notas de venta para este día.
                      </td>
                    </tr>
                  ) : (
                    saleNotes.map((note) => (
                      <tr key={note.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          #{note.id}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {dayjs(note.createdAt).format("HH:mm")}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {note.clientName || (
                            <span className="text-gray-400">Sin nombre</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {note.user.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            {getPaymentMethods(note.paymentDetails)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-right text-gray-900">
                          S/{note.total.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                          S/{note.totalPaid.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-purple-600 font-medium">
                          S/{note.change.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {note.status === "CANCELLED" ? (
                            <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-700">
                              Cancelada
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-700">
                              Activa
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            className="p-2 rounded-full hover:bg-blue-100 transition-colors"
                            title="Ver detalle completo"
                            onClick={() => handleShowDetail(note.id)}
                          >
                            <Eye className="text-blue-600" size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Vista Móvil */}
            <div className="md:hidden">
              {loadingNotes ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  <span className="ml-2 text-gray-600">Cargando...</span>
                </div>
              ) : saleNotes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay notas de venta para este día.
                </div>
              ) : (
                saleNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 border-b border-gray-200 last:border-b-0"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">
                            #{note.id}
                          </span>
                          <span className="text-sm text-gray-500">
                            {dayjs(note.createdAt).format("HH:mm")}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 mb-1">
                          <span className="font-medium">Cliente:</span>{" "}
                          {note.clientName || "Sin nombre"}
                        </div>
                        <div className="text-sm text-gray-700 mb-2">
                          <span className="font-medium">Usuario:</span>{" "}
                          {note.user.name}
                        </div>
                        <div className="text-xs text-gray-600 mb-2">
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            {getPaymentMethods(note.paymentDetails)}
                          </span>
                        </div>
                      </div>
                      <button
                        className="p-2 rounded-full hover:bg-blue-100 transition-colors ml-2"
                        title="Ver detalle completo"
                        onClick={() => handleShowDetail(note.id)}
                      >
                        <Eye className="text-blue-600" size={18} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-500">Total</div>
                        <div className="font-semibold text-gray-900">
                          S/{note.total.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded">
                        <div className="text-xs text-gray-500">Pagado</div>
                        <div className="font-semibold text-green-600">
                          S/{note.totalPaid.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-center p-2 bg-purple-50 rounded">
                        <div className="text-xs text-gray-500">Cambio</div>
                        <div className="font-semibold text-purple-600">
                          S/{note.change.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Lista de productos vendidos */}
        {stats &&
          stats.productosVendidos &&
          stats.productosVendidos.length > 0 && (
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
                            <div className="text-sm font-medium text-gray-900">
                              {prod.nombre}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {prod.cantidadPacks}{" "}
                              {prod.unitsPerPackage > 1 ? "packs" : "unidades"}
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
                    <div
                      key={prod.id}
                      className="p-4 border-b border-gray-200 last:border-b-0"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {prod.nombre}
                          </h3>
                          <div className="mt-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {prod.cantidadPacks}{" "}
                                {prod.unitsPerPackage > 1
                                  ? "packs"
                                  : "unidades"}
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
                      <span className="text-blue-700 font-bold">
                        {stats.totalProductosVendidos}
                      </span>
                    </div>
                    <div className="text-gray-600">
                      <span className="font-semibold">Total unidades:</span>{" "}
                      <span className="text-purple-700 font-bold">
                        {stats.totalUnidadesIndividuales}
                      </span>
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
              Datos del {dayjs(stats.rango.inicio).format("DD/MM/YYYY HH:mm")}{" "}
              al {dayjs(stats.rango.fin).format("DD/MM/YYYY HH:mm")}
            </p>
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-gray-200 gap-4">
              <h2 className="text-2xl font-bold text-gray-800">
                Detalle de Nota de Venta #{detail?.id}
              </h2>

              <div className="flex items-center gap-3">
                {/* Botón cerrar modal */}
                <button
                  onClick={closeDetail}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
                  title="Cerrar"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* Badge de estado cancelado */}
            {detail && detail.status === "CANCELLED" && (
              <div className="px-6 py-3 bg-red-50 border-b border-red-200">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span className="text-red-700 font-medium text-sm">
                    Esta nota de venta ha sido cancelada
                  </span>
                </div>
              </div>
            )}

            {/* Contenido del modal */}
            <div className="p-6">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600">
                    Cargando detalle...
                  </span>
                </div>
              ) : detail ? (
                <div className="space-y-6">
                  {/* Información general */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">
                          Información General
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">ID:</span>
                            <span className="font-medium">#{detail.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Fecha:</span>

                            <span className="font-medium">
                              {dayjs(detail.createdAt).format(
                                "DD/MM/YYYY HH:mm"
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Estado:</span>
                            <span
                              className={`font-medium ${
                                detail.status === "CANCELLED"
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                            >
                              {detail.status === "CANCELLED"
                                ? "CANCELADA"
                                : "ACTIVA"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Cliente:</span>
                            <span className="font-medium">
                              {detail.clientName || "Sin nombre"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Usuario:</span>
                            <span className="font-medium">
                              {detail.user.name}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Comentario:</span>
                            <span className="font-medium">
                              {detail.comment || "Sin comentario"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">
                          Información de Pago
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              Métodos de pago:
                            </span>
                            <span className="font-medium">
                              {getPaymentMethods(detail.paymentDetails)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total:</span>
                            <span className="font-bold text-blue-600">
                              S/{detail.total.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Pagado:</span>
                            <span className="font-bold text-green-600">
                              S/{detail.totalPaid.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Cambio:</span>
                            <span className="font-bold text-purple-600">
                              S/{detail.change.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {detail.status !== "CANCELLED" && (
                        <button
                          className="px-3 py-1 bg-red-600 text-white font-medium rounded-lg shadow-sm hover:bg-red-700 hover:shadow-md transition-all duration-200 flex items-center gap-2 text-xs"
                          onClick={() => setShowConfirmCancel(true)}
                        >
                          <AlertTriangle className="w-4 h-4" />
                          <span>Cancelar nota</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Productos vendidos */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      Productos Vendidos
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border border-gray-200 rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Producto
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              Cantidad
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              Precio Unit.
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              Subtotal
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {detail.details.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {item.productName || item.product?.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {item.productDescription ||
                                    item.product?.description}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-gray-900">
                                {item.quantity}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-gray-900">
                                S/{item.price.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                                S/{item.subtotal.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td
                              colSpan={3}
                              className="px-4 py-3 text-right text-sm font-semibold text-gray-900"
                            >
                              Total:
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-bold text-blue-600">
                              S/{detail.total.toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  No se pudo cargar el detalle de la nota de venta.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NUEVO: Modal de confirmación para cancelar */}
      {showConfirmCancel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="text-red-600" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Cancelar nota de venta
                  </h3>
                  <p className="text-sm text-gray-600">
                    Esta acción no se puede deshacer
                  </p>
                </div>
              </div>

              <p className="text-gray-700 mb-6">
                ¿Estás seguro de que deseas cancelar la nota de venta #
                {detail?.id}?
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition font-medium"
                  onClick={() => setShowConfirmCancel(false)}
                  disabled={cancellingNote}
                >
                  Cancelar
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition font-medium flex items-center gap-2"
                  onClick={handleCancelNote}
                  disabled={cancellingNote}
                >
                  {cancellingNote && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {cancellingNote ? "Cancelando..." : "Sí, cancelar nota"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
