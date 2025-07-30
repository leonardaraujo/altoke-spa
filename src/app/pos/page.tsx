"use client";
import { ShoppingCart, Coffee, Plus, Minus, Trash2, Search, CreditCard, X, Check, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useUserStore } from "@/store/userStore";
import { useCartStore } from "@/store/cartStore";
import { Producto } from "@/store/types/cart";
import toast, { Toaster } from "react-hot-toast";
import { generateReceipt } from "@/utils/receiptTemplate";
import usePrinterStore from "@/store/printerStore";
import { writeData } from "@/utils/printerUtils";

type PaymentType = {
  id: number;
  name: string;
  description?: string;
};

type Payment = {
  paymentTypeId: number;
  amount: number;
  paymentTypeName: string;
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "";

export default function POSPage() {
  // Store del carrito
  const {
    carrito,
    productosCarrito,
    agregarProducto,
    cambiarCantidad,
    eliminarProducto,
    limpiarCarrito,
    getTotalCarrito,
    getTotalUnidades,
    getCantidadProductos,
    loadFromStorage,
  } = useCartStore();

  // Estados locales (sin carrito)
  const [productos, setProductos] = useState<Producto[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 4;

  // Estados del modal de pago
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedPaymentType, setSelectedPaymentType] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [clientName, setClientName] = useState("");
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);

  // UserStore
  const { user, loadFromStorage: loadUserFromStorage } = useUserStore();

  // Printer store
  const toggleCharacteristic = usePrinterStore((state) => state.toggleCharacteristic);

  // Cargar datos al montar
  useEffect(() => {
    loadUserFromStorage();
    loadFromStorage(); // Cargar carrito desde localStorage
  }, [loadUserFromStorage, loadFromStorage]);

  // Cargar productos con paginación y búsqueda
  useEffect(() => {
    const fetchProductos = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          pageSize: pageSize.toString(),
          ...(busqueda && { q: busqueda })
        });
        
        const res = await fetch(`/api/products?${params}`);
        const data = await res.json();
        
        setProductos(data.products || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
        
      } catch (error) {
        console.error("Error cargando productos:", error);
        toast.error("Error al cargar productos");
      } finally {
        setLoading(false);
      }
    };
    fetchProductos();
  }, [busqueda, currentPage]);

  // Reset page cuando cambia la búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [busqueda]);

  // Cargar tipos de pago
  useEffect(() => {
    const fetchPaymentTypes = async () => {
      const res = await fetch('/api/payment-types');
      const data = await res.json();
      setPaymentTypes(data.paymentTypes || []);
    };
    fetchPaymentTypes();
  }, []);

  // Valores calculados del carrito
  const total_carrito = getTotalCarrito();
  const totalUnidades = getTotalUnidades();
  const cantidadProductos = getCantidadProductos();

  // Valores del modal de pago
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const change = Math.max(0, totalPaid - total_carrito);
  const remaining = Math.max(0, total_carrito - totalPaid);

  // Funciones de paginación
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Funciones de pago
  const agregarPago = () => {
    if (!selectedPaymentType || !paymentAmount || Number(paymentAmount) <= 0) {
      toast.error("Selecciona un tipo de pago y un monto válido");
      return;
    }

    const paymentType = paymentTypes.find(pt => pt.id === selectedPaymentType);
    if (!paymentType) return;

    const amount = Number(paymentAmount);
    const isCash = paymentType.name.toLowerCase().includes("efectivo") || paymentType.name.toLowerCase().includes("cash");
    const faltante = Math.max(0, total_carrito - totalPaid);

    if (!isCash && amount > faltante) {
      toast.error("Solo puedes ingresar como máximo el monto faltante para este método de pago.");
      return;
    }

    setPayments(prev => [...prev, {
      paymentTypeId: selectedPaymentType,
      amount,
      paymentTypeName: paymentType.name
    }]);

    setSelectedPaymentType(null);
    setPaymentAmount("");
  };

  const eliminarPago = (index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  };

  // NUEVO: Imprimir recibo
  const imprimirRecibo = async (venta: any) => {
    try {
      if (!toggleCharacteristic) {
        toast.error("No hay impresora conectada - Recibo no impreso");
        return;
      }

      // Adaptar los datos de la venta para el template
      const saleDetails = venta.details?.map((item: any) => ({
        quantity: item.quantity,
        price: item.price,
        productName: item.product?.name || "",
        productDescription: item.product?.description || "",
        unitsPerPackage: item.product?.unitsPerPackage || 1,
      })) || [];

      // Adaptar los pagos
      const pagos = (venta.payments || []).map((p: any) => ({
        name: p.paymentTypeName || "",
        amount: p.amount,
      }));

      // Generar el buffer del recibo
      const buffer = generateReceipt({
        sale: {
          id: venta.id,
          clientName: venta.clientName,
          comment: venta.comment,
          total: venta.total,
          totalPaid: venta.totalPaid,
          change: venta.change,
          createdAt: venta.createdAt,
          details: saleDetails,
        },
        user: { name: user?.name || "Vendedor" },
        payments: pagos,
        businessName: "KUSKAS",
        ruc: "RUC 12345678901",
        address: "Jr. Miguel Grau 305-Cochas Chico",
      });

      // Enviar a la impresora
      await writeData(new Uint8Array(buffer), toggleCharacteristic);
      toast.success("✅ Recibo enviado a la impresora");
    } catch (err) {
      toast.error("❌ No se pudo imprimir el recibo");
      console.error("Error imprimiendo:", err);
    }
  };

  const procesarVenta = async () => {
    if (!user) {
      toast.error("Debes iniciar sesión para vender");
      return;
    }

    if (carrito.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }

    if (payments.length === 0) {
      toast.error("Debe agregar al menos un método de pago");
      return;
    }

    if (totalPaid < total_carrito) {
      toast.error("El monto pagado es insuficiente");
      return;
    }

    setProcessing(true);

    try {
      const saleData = {
        userId: user.id,
        clientName: clientName || null,
        comment: comment || null,
        details: carrito.map(item => ({
          productId: item.id,
          quantity: item.cantidad,
          price: item.price
        })),
        payments: payments,
        totalPaid,
        change
      };

      const response = await fetch('/api/salenote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saleData)
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`✅ Venta procesada exitosamente. Vuelto: S/${change.toFixed(2)}`);

        // Limpiar el carrito usando el store
        limpiarCarrito();
        setPayments([]);
        setClientName("");
        setComment("");
        setShowPaymentModal(false);

        // IMPRIMIR RECIBO TRAS VENTA EXITOSA
        await imprimirRecibo(result.saleNote || result);
      } else {
        const error = await response.json();
        toast.error(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error al procesar venta:", error);
      toast.error("Error al procesar la venta");
    } finally {
      setProcessing(false);
    }
  };

  const abrirModalPago = () => {
    if (carrito.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }
    setShowPaymentModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Buscador */}
            <div className="relative w-full md:w-96">
              <input
                type="text"
                placeholder="Buscar productos..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                suppressHydrationWarning={true}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>
            
            {/* Info de resultados */}
            <div className="text-sm text-gray-600">
              {busqueda ? (
                <span>Resultados para "{busqueda}": {total} productos</span>
              ) : (
                <span>Total: {total} productos</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de productos con paginación */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Productos Disponibles</h2>
                
                {/* Paginación superior */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      Página {currentPage} de {totalPages}
                    </span>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600">Cargando productos...</span>
                </div>
              ) : (
                <>
                  {/* Grid de productos mejorado */}
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                    {productos.length === 0 ? (
                      <div className="col-span-full text-center py-12">
                        <Coffee className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-500">
                          {busqueda ? `No se encontraron productos para "${busqueda}"` : "No hay productos disponibles"}
                        </p>
                      </div>
                    ) : (
                      productos.map((prod) => {
                        const isPack = prod.unitsPerPackage && prod.unitsPerPackage > 1;
                        return (
                          <div
                            key={prod.id}
                            className="group bg-white border-2 border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:shadow-lg transition-all duration-200 flex flex-col h-full"
                          >
                            {/* Imagen del producto */}
                            <div className="w-full aspect-square mb-3 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                              {prod.images?.small ? (
                                <img
                                  src={`${BASE_URL}${prod.images.small}`}
                                  alt={prod.name}
                                  className="w-full h-full object-cover"
                                  onError={e => (e.currentTarget.style.display = "none")}
                                />
                              ) : (
                                <Coffee className="text-gray-400" size={24} />
                              )}
                            </div>

                            {/* Info del producto */}
                            <div className="flex-1 flex flex-col">
                              {/* Nombre - altura fija */}
                              <h3 className="font-semibold text-gray-800 text-sm mb-2 line-clamp-2 min-h-[2.5rem] flex items-start">
                                {prod.name}
                              </h3>
                              
                              {/* Descripción - altura fija */}
                              {prod.description && (
                                <p className="text-xs text-gray-500 mb-2 line-clamp-2 min-h-[2rem] flex items-start">
                                  {prod.description}
                                </p>
                              )}
                              
                              {/* Badge de tipo */}
                              <div className="mb-2">
                                {isPack ? (
                                  <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                                    <Package size={12} />
                                    Pack de {prod.unitsPerPackage}
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                                    Unitario
                                  </div>
                                )}
                              </div>

                              {/* Precio */}
                              <div className="mt-auto">
                                <div className="text-center mb-3">
                                  <span className="text-blue-600 font-bold text-lg">
                                    S/{prod.price.toFixed(2)}
                                  </span>
                                  {isPack && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    S/{(prod?.price && prod?.unitsPerPackage ? (prod.price / prod.unitsPerPackage).toFixed(2) : "0.00")} por unidad
                                  </div>
                                 )}
                                </div>

                                {/* Botón agregar */}
                                <button
                                  onClick={() => agregarProducto(prod)}
                                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                  <Plus size={16} />
                                  Agregar
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Paginación inferior */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      
                      {/* Números de página - máximo 4 */}
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(4, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 4) {
                            pageNum = i + 1;
                          } else if (currentPage <= 2) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 1) {
                            pageNum = totalPages - 3 + i;
                          } else {
                            pageNum = currentPage - 1 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => goToPage(pageNum)}
                              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                currentPage === pageNum
                                  ? "bg-blue-500 text-white"
                                  : "border border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Carrito */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-6">
              {/* Header del carrito */}
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ShoppingCart className="text-blue-600" size={24} />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-800">Carrito</h2>
                  {carrito.length > 0 && (
                    <p className="text-sm text-gray-500">
                      {cantidadProductos} productos
                    </p>
                  )}
                </div>
                {carrito.length > 0 && (
                  <div className="text-right">
                    <div className="bg-blue-100 text-blue-600 text-xs font-medium px-2 py-1 rounded-full">
                      {totalUnidades} unidades
                    </div>
                  </div>
                )}
              </div>

              {/* Lista de productos en carrito */}
              <div className="space-y-3 mb-6 max-h-80 overflow-y-auto">
                {carrito.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <ShoppingCart className="text-gray-400" size={32} />
                    </div>
                    <p className="text-gray-500 text-sm">El carrito está vacío</p>
                    <p className="text-gray-400 text-xs mt-1">Agrega productos para comenzar</p>
                  </div>
                ) : (
                  carrito.map((item) => {
                    // AHORA usamos el Map del store
                    const prod = productosCarrito.get(item.id);
                    const isPack = !!prod && !!prod.unitsPerPackage && prod.unitsPerPackage > 1;
                    const unidadesReales = isPack ? (prod?.unitsPerPackage ?? 1) * item.cantidad : item.cantidad;
                    
                    return (
                      <div key={item.id} className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-100 hover:shadow-sm transition-all">
                        <div className="flex gap-3">
                          {/* Imagen */}
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-white flex items-center justify-center border-2 border-white shadow-sm">
                            {prod?.images?.small ? (
                              <img
                                src={`${BASE_URL}${prod.images.small}`}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Coffee className="text-gray-400" size={24} />
                            )}
                          </div>
                          
                          {/* Info del producto */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-800 text-sm truncate mb-1">
                              {item.name}
                            </h4>
                            
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-blue-600 font-bold text-sm">
                                S/{item.price.toFixed(2)}
                              </span>
                            {isPack ? (
                              <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                                <Package size={12} />
                                Pack de {prod?.unitsPerPackage ?? 1}
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                                Unitario
                              </div>
                            )}
                            </div>

                            {/* Controles de cantidad */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
                                <button
                                  onClick={() => cambiarCantidad(item.id, -1)}
                                  className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="w-8 text-center text-sm font-semibold">
                                  {item.cantidad}
                                </span>
                                <button
                                  onClick={() => cambiarCantidad(item.id, 1)}
                                  className="w-6 h-6 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-600 flex items-center justify-center transition-colors"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                              
                              <div className="text-right">
                                <div className="text-sm font-bold text-gray-800">
                                  S/{(item.price * item.cantidad).toFixed(2)}
                                </div>
                                <div className="text-xs text-blue-600 font-medium">
                                  {unidadesReales} unid.
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Botón eliminar */}
                          <button
                            onClick={() => eliminarProducto(item.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors self-start"
                            title="Eliminar producto"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Resumen total */}
              {carrito.length > 0 && (
                <div className="border-t border-gray-200 pt-6">
                  <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-4 mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-lg font-semibold text-gray-800">Total</span>
                      <span className="text-3xl font-bold text-green-600">
                        S/{total_carrito.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Unidades totales:</span>
                      <span className="font-semibold text-blue-600">
                        {totalUnidades} unidades
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={abrirModalPago}
                    className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white py-4 rounded-xl font-bold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
                    disabled={carrito.length === 0}
                  >
                    <CreditCard size={24} />
                    Procesar Pago
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Pago */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">Procesar Pago</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Resumen de compra */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total a pagar:</span>
                  <span className="text-blue-600">S/{total_carrito.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600 mt-1">
                  <span>Unidades totales:</span>
                  <span>{totalUnidades} unidades</span>
                </div>
              </div>

              {/* Cliente y comentario */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente (opcional)
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nombre del cliente"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comentario (opcional)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Comentarios adicionales"
                  />
                </div>
              </div>

              {/* Agregar pago */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-800 mb-3">Métodos de Pago</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <select
                        value={selectedPaymentType || ""}
                        onChange={(e) => setSelectedPaymentType(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Tipo de pago</option>
                        {paymentTypes.map(pt => (
                          <option key={pt.id} value={pt.id}>{pt.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) => {
                          const value = e.target.value;
                          const paymentType = paymentTypes.find(pt => pt.id === selectedPaymentType);
                          const isCash = paymentType?.name?.toLowerCase().includes("efectivo") || paymentType?.name?.toLowerCase().includes("cash");
                          const faltante = Math.max(0, total_carrito - totalPaid);
                          if (!isCash && Number(value) > faltante) {
                            setPaymentAmount(faltante === 0 ? "" : String(faltante));
                          } else {
                            setPaymentAmount(value);
                          }
                        }}
                        className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${!selectedPaymentType ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""}`}
                        placeholder={selectedPaymentType ? "Monto" : "Selecciona un tipo de pago"}
                        min={0.01}
                        max={
                          (() => {
                            const paymentType = paymentTypes.find(pt => pt.id === selectedPaymentType);
                            const isCash = paymentType?.name?.toLowerCase().includes("efectivo") || paymentType?.name?.toLowerCase().includes("cash");
                            return isCash ? undefined : Math.max(0, total_carrito - totalPaid);
                          })()
                        }
                        disabled={!selectedPaymentType}
                      />
                      {/* Botón para completar el pago con el monto faltante */}
                      <button
                        type="button"
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 rounded transition"
                        disabled={
                          !selectedPaymentType ||
                          (paymentTypes.find(pt => pt.id === selectedPaymentType)?.name?.toLowerCase().includes("efectivo")
                            ? false
                            : remaining <= 0)
                        }
                        onClick={() => {
                          setPaymentAmount(String(Math.max(0, total_carrito - totalPaid)));
                        }}
                        title="Completar con el monto faltante"
                      >
                        Completar
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={agregarPago}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors"
                    disabled={!selectedPaymentType || !paymentAmount}
                  >
                    Agregar Pago
                  </button>
                </div>
              </div>

              {/* Lista de pagos */}
              {payments.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-800 mb-3">Pagos Agregados</h4>
                  <div className="space-y-2">
                    {payments.map((payment, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div>
                          <span className="font-medium">{payment.paymentTypeName}</span>
                          <span className="text-blue-600 font-semibold ml-2">S/{payment.amount.toFixed(2)}</span>
                        </div>
                        <button
                          onClick={() => eliminarPago(index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resumen de pago */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-semibold">S/{total_carrito.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pagado:</span>
                  <span className="font-semibold text-green-600">S/{totalPaid.toFixed(2)}</span>
                </div>
                {remaining > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Falta:</span>
                    <span className="font-semibold">S/{remaining.toFixed(2)}</span>
                  </div>
                )}
                {change > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Vuelto:</span>
                    <span className="font-semibold">S/{change.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Botón procesar */}
              <button
                onClick={procesarVenta}
                disabled={remaining > 0 || payments.length === 0 || processing}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    Completar Venta
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}