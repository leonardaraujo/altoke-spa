"use client";
import { useEffect, useState } from "react";
import { Plus, Edit3, Package, Search, ChevronLeft, ChevronRight, Star } from "lucide-react"; // Cambia Heart por Star
import { ProductModal } from "@/components/ProductModal";
import toast, { Toaster } from "react-hot-toast";

type Producto = {
  id: number;
  name: string;
  description?: string | null;
  image: string;
  price: number;
  unitsPerPackage?: number | null;
  active: boolean;
  isFavorite?: boolean;
  images?: {
    full: string;
    mid: string;
    small: string;
  };
};

type ProductForm = {
  name: string;
  description?: string | null; // <-- permite null
  price: number;
  isGroup: boolean;
  unitsPerPackage?: number;
  image?: FileList;
  active?: boolean;
  isFavorite?: boolean;
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "";

export default function ManageProductsPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);

  // Estados de búsqueda y paginación
  const [busqueda, setBusqueda] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 8;

  // Cargar productos con búsqueda y paginación
  const fetchProductos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        ...(busqueda && { q: busqueda })
      });

      const res = await fetch(`/api/products/all?${params}`);
      const data = await res.json();
      
      setProductos(data.products || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error al cargar productos:", error);
      toast.error("Error al cargar productos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, [busqueda, currentPage]);

  // Reset page cuando cambia la búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [busqueda]);

  // Funciones de paginación
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Crear producto
  const handleCreateProduct = async (data: ProductForm) => {
    const formData = new FormData();
    formData.append("name", data.name);
    if (data.description) formData.append("description", data.description);
    formData.append("price", data.price.toString());
    formData.append("unitsPerPackage", (data.unitsPerPackage || 1).toString());
    formData.append("active", "true");
    formData.append("isFavorite", data.isFavorite ? "true" : "false");
    if (data.image && data.image.length > 0) {
      formData.append("image", data.image[0]);
    }

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        await fetchProductos();
        setShowCreateModal(false);
        toast.success("Producto creado correctamente");
      } else {
        const error = await res.text();
        toast.error(`Error al crear producto: ${error}`);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al crear producto");
    }
  };

  // Editar producto
  const handleEditProduct = async (data: ProductForm) => {
    if (!editingProduct) return;

    try {
      let res;

      // Si hay imagen nueva, usar FormData
      if (data.image && data.image.length > 0) {
        const formData = new FormData();
        formData.append("name", data.name);
        if (data.description) formData.append("description", data.description);
        formData.append("price", data.price.toString());
        formData.append("unitsPerPackage", (data.unitsPerPackage || 1).toString());
        formData.append("active", data.active ? "true" : "false");
        formData.append("isFavorite", data.isFavorite ? "true" : "false");
        formData.append("image", data.image[0]);

        res = await fetch(`/api/products/${editingProduct.id}`, {
          method: "PATCH",
          body: formData,
        });
      } else {
        // Sin imagen, usar JSON
        const updateData = {
          name: data.name,
          description: data.description,
          price: data.price,
          unitsPerPackage: data.unitsPerPackage || 1,
          active: data.active,
          isFavorite: data.isFavorite,
        };

        res = await fetch(`/api/products/${editingProduct.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });
      }

      if (res.ok) {
        await fetchProductos();
        setShowEditModal(false);
        setEditingProduct(null);
        toast.success("Producto actualizado correctamente");
      } else {
        toast.error("Error al actualizar producto");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al actualizar producto");
    }
  };

  // Abrir modal de edición
  const openEditModal = (product: Producto) => {
    setEditingProduct(product);
    setShowEditModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 lg:p-8">
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Gestión de Productos</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Agregar producto
          </button>
        </div>

        {/* Buscador y información */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Buscador */}
            <div className="relative w-full md:w-96">
              <input
                type="text"
                placeholder="Buscar productos por nombre..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
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

        {/* Lista de productos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Lista de productos</h2>
            
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
              {/* Vista de tabla para desktop */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Imagen</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidades</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Favorito</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {productos.map((prod) => (
                      <tr key={prod.id} className={prod.active ? "" : "bg-red-50"}>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {prod.images?.small ? (
                            <img
                              src={`${BASE_URL}${prod.images.small}`}
                              alt={prod.name}
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                              <span className="text-gray-400 text-xs">Sin imagen</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-medium text-gray-900">{prod.name}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-500">{prod.description || "-"}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">S/{prod.price.toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`text-sm px-2 py-1 rounded-full ${
                            (prod.unitsPerPackage && prod.unitsPerPackage > 1) 
                              ? "bg-blue-100 text-blue-800" 
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {prod.unitsPerPackage || 1} {(prod.unitsPerPackage && prod.unitsPerPackage > 1) ? "pack" : "unidad"}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          {prod.isFavorite ? (
                            <Star size={18} className="text-yellow-400 fill-current mx-auto" />
                          ) : (
                            <Star size={18} className="text-gray-300 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            prod.active 
                              ? "bg-green-100 text-green-800" 
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {prod.active ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button
                            onClick={() => openEditModal(prod)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vista de tarjetas para móvil */}
              <div className="lg:hidden space-y-4">
                {productos.map((prod) => (
                  <div
                    key={prod.id}
                    className={`border rounded-lg p-4 ${prod.active ? "border-gray-200" : "border-red-200 bg-red-50"}`}
                  >
                    <div className="flex items-start gap-3">
                      {prod.images?.small ? (
                        <img
                          src={`${BASE_URL}${prod.images.small}`}
                          alt={prod.name}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-gray-400 text-xs">Sin imagen</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-medium text-gray-900 truncate">{prod.name}</h3>
                              {prod.isFavorite && (
                                <Star size={14} className="text-yellow-400 fill-current" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{prod.description || "Sin descripción"}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-lg font-semibold text-blue-600">S/{prod.price.toFixed(2)}</span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                (prod.unitsPerPackage && prod.unitsPerPackage > 1) 
                                  ? "bg-blue-100 text-blue-800" 
                                  : "bg-gray-100 text-gray-600"
                              }`}>
                                {prod.unitsPerPackage || 1} {(prod.unitsPerPackage && prod.unitsPerPackage > 1) ? "pack" : "unidad"}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                prod.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                              }`}>
                                {prod.active ? "Activo" : "Inactivo"}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 ml-2">
                            <button
                              onClick={() => openEditModal(prod)}
                              className="p-1 rounded bg-blue-100 text-blue-700"
                            >
                              <Edit3 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Paginación inferior */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  {/* Números de página - máximo 8 */}
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(8, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 8) {
                        pageNum = i + 1;
                      } else if (currentPage <= 4) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 3) {
                        pageNum = totalPages - 7 + i;
                      } else {
                        pageNum = currentPage - 3 + i;
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

              {productos.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="text-gray-400" size={24} />
                  </div>
                  <p className="text-gray-500">
                    {busqueda ? `No se encontraron productos para "${busqueda}"` : "No hay productos registrados"}
                  </p>
                  {!busqueda && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Agregar el primer producto
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modales */}
      <ProductModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateProduct}
        isEdit={false}
      />

      <ProductModal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingProduct(null);
        }}
        onSubmit={handleEditProduct}
        initialData={editingProduct || undefined}
        isEdit={true}
      />
    </div>
  );
}