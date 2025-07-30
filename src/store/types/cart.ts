export interface Producto {
  id: number;
  name: string;
  price: number;
  image: string;
  description?: string | null;
  unitsPerPackage?: number | null;
  images?: {
    full: string;
    mid: string;
    small: string;
  };
}

export interface CartItem {
  id: number;
  name: string;
  price: number;
  cantidad: number;
}

export interface CartStore {
  // Estado
  carrito: CartItem[];
  productosCarrito: Map<number, Producto>;
  
  // Acciones
  agregarProducto: (producto: Producto) => void;
  cambiarCantidad: (id: number, delta: number) => void;
  eliminarProducto: (id: number) => void;
  limpiarCarrito: () => void;
  
  // Getters computados
  getTotalCarrito: () => number;
  getTotalUnidades: () => number;
  getCantidadProductos: () => number;
  
  // Persistencia
  loadFromStorage: () => void;
  saveToStorage: () => void;
}
