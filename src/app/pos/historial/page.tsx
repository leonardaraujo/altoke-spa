"use client";
import { useEffect, useState } from "react";

type MetodoPago = {
  paymentTypeId: number;
  paymentTypeName: string;
  amount: number;
};

type Producto = {
  nombre: string;
  cantidad: number;
  precio: number;
  subtotal: number;
};

type Venta = {
  id: number;
  fecha: string;
  usuario: string;
  total: number;
  totalPagado: number;
  vuelto: number;
  metodosPago: MetodoPago[];
  productos: Producto[];
};

export default function HistorialVentas() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVentas = async () => {
      setLoading(true);
      const res = await fetch("/api/salenote/last");
      const data = await res.json();
      setVentas(data.ventas || []);
      setLoading(false);
    };
    fetchVentas();
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Últimas 3 Ventas</h1>
      {loading ? (
        <div className="text-center py-8 text-gray-500">Cargando ventas...</div>
      ) : ventas.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No hay ventas registradas.</div>
      ) : (
        <div className="space-y-8">
          {ventas.map((venta) => (
            <div key={venta.id} className="bg-white rounded-xl shadow p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-blue-700">Venta #{venta.id}</span>
                <span className="text-sm text-gray-500">{new Date(venta.fecha).toLocaleString()}</span>
              </div>
              <div className="mb-2">
                <span className="text-gray-700">Vendedor:</span>{" "}
                <span className="font-medium">{venta.usuario}</span>
              </div>
              <div className="mb-2">
                <span className="text-gray-700">Total:</span>{" "}
                <span className="font-bold text-green-700">S/{venta.total.toFixed(2)}</span>
                {venta.vuelto > 0 && (
                  <span className="ml-4 text-blue-600">Vuelto: S/{venta.vuelto.toFixed(2)}</span>
                )}
              </div>
              <div className="mb-2">
                <span className="text-gray-700">Pagado:</span>{" "}
                <span className="font-semibold">S/{venta.totalPagado?.toFixed(2) ?? venta.total.toFixed(2)}</span>
              </div>
              <div className="mb-2">
                <span className="text-gray-700">Métodos de pago:</span>
                <ul className="list-disc ml-6">
                  {venta.metodosPago.map((mp, idx) => (
                    <li key={idx}>
                      <span className="font-medium">{mp.paymentTypeName}</span>: S/{mp.amount.toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="text-gray-700">Productos vendidos:</span>
                <ul className="list-disc ml-6">
                  {venta.productos.map((prod, idx) => (
                    <li key={idx}>
                      {prod.nombre} x{prod.cantidad} — S/{prod.precio.toFixed(2)} c/u (Subtotal: S/{prod.subtotal.toFixed(2)})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}