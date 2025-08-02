"use client";
import { useEffect, useState } from "react";
import usePrinterStore from "@/store/printerStore";
import { Printer } from "lucide-react";
import { writeData } from "@/utils/printerUtils";
import { generateReceipt } from "@/utils/receiptTemplate";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);
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
  status: "ACTIVE" | "CANCELLED";
};

export default function HistorialVentas() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [printingId, setPrintingId] = useState<number | null>(null);

  // Estado de la impresora
  const printerState = usePrinterStore((state) => state.printerState);
  const printerChar = usePrinterStore((state) => state.toggleCharacteristic);

  // Función para imprimir usando el template y la utilidad
  const handlePrint = async (venta: Venta) => {
    setPrintingId(venta.id);
    try {
      // Adaptar los datos de la venta al formato del template
      const sale = {
        id: venta.id,
        clientName: "Público General",
        comment: "",
        total: venta.total,
        totalPaid: venta.totalPagado,
        change: venta.vuelto,
        createdAt: venta.fecha,
        details: venta.productos.map((prod) => ({
          quantity: prod.cantidad,
          price: prod.precio,
          productName: prod.nombre,
        })),
        paymentDetails: JSON.stringify(venta.metodosPago.map(mp => ({
          name: mp.paymentTypeName,
          amount: mp.amount,
        }))),
      };

      // Usuario vendedor
      const user = { name: venta.usuario };

      // Métodos de pago
      const payments = venta.metodosPago.map(mp => ({
        name: mp.paymentTypeName,
        amount: mp.amount,
      }));

      // Generar el recibo (Uint8Array)
      const receiptBytes = generateReceipt({
        sale,
        user,
        payments,
      });

      // Enviar a la impresora
      await writeData(receiptBytes, printerChar);
    } catch (err) {
      console.log(err)
    }
    setPrintingId(null);
  };

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
               <span className="text-sm text-gray-500">
                {dayjs(venta.fecha).tz("America/Lima").format("DD/MM/YYYY HH:mm")}
              </span>
              </div>
              <div className="mb-2">
                <span className="text-gray-700">Estado:</span>{" "}
                {venta.status === "CANCELLED" ? (
                  <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-700">Cancelada</span>
                ) : (
                  <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-700">Activa</span>
                )}
              </div>
              {/* Botón imprimir solo si está activa y la impresora conectada */}
              {venta.status === "ACTIVE" && printerState && (
                <button
                  onClick={() => handlePrint(venta)}
                  disabled={printingId === venta.id}
                  className="mb-2 flex items-center gap-2 px-3 py-1 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60"
                  title="Imprimir de nuevo"
                >
                  <Printer size={16} />
                  {printingId === venta.id ? "Imprimiendo..." : "Imprimir de nuevo"}
                </button>
              )}
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