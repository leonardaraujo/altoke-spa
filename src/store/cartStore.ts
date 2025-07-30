
import { create } from 'zustand';
import { CartStore, CartItem, Producto } from './types/cart';
const STORAGE_KEY = 'altoke-cart';

export const useCartStore = create<CartStore>((set, get) => ({
  // Estado inicial
  carrito: [],
  productosCarrito: new Map(),

  // Agregar producto al carrito
  agregarProducto: (producto: Producto) => {
    set((state) => {
      // Actualizar el mapa de productos
      const newProductosCarrito = new Map(state.productosCarrito);
      newProductosCarrito.set(producto.id, producto);

      // Actualizar el carrito
      const existe = state.carrito.find((p) => p.id === producto.id);
      let newCarrito: CartItem[];

      if (existe) {
        newCarrito = state.carrito.map((p) =>
          p.id === producto.id ? { ...p, cantidad: p.cantidad + 1 } : p
        );
      } else {
        newCarrito = [
          ...state.carrito,
          {
            id: producto.id,
            name: producto.name,
            price: producto.price,
            cantidad: 1,
          },
        ];
      }

      const newState = {
        carrito: newCarrito,
        productosCarrito: newProductosCarrito,
      };

      // Guardar en localStorage
      saveToLocalStorage(newState);
      return newState;
    });
  },

  // Cambiar cantidad de un producto
  cambiarCantidad: (id: number, delta: number) => {
    set((state) => {
      const newCarrito = state.carrito
        .map((p) =>
          p.id === id ? { ...p, cantidad: Math.max(1, p.cantidad + delta) } : p
        )
        .filter((p) => p.cantidad > 0);

      // Si el producto se eliminó del carrito, también eliminarlo del mapa
      let newProductosCarrito = new Map(state.productosCarrito);
      const productExists = newCarrito.some((item) => item.id === id);
      if (!productExists) {
        newProductosCarrito.delete(id);
      }

      const newState = {
        carrito: newCarrito,
        productosCarrito: newProductosCarrito,
      };

      // Guardar en localStorage
      saveToLocalStorage(newState);
      return newState;
    });
  },

  // Eliminar producto del carrito
  eliminarProducto: (id: number) => {
    set((state) => {
      const newCarrito = state.carrito.filter((p) => p.id !== id);
      const newProductosCarrito = new Map(state.productosCarrito);
      newProductosCarrito.delete(id);

      const newState = {
        carrito: newCarrito,
        productosCarrito: newProductosCarrito,
      };

      // Guardar en localStorage
      saveToLocalStorage(newState);
      return newState;
    });
  },

  // Limpiar todo el carrito
  limpiarCarrito: () => {
    const newState = {
      carrito: [],
      productosCarrito: new Map(),
    };

    set(newState);
    saveToLocalStorage(newState);
  },

  // Getter: Total del carrito
  getTotalCarrito: () => {
    const { carrito } = get();
    return carrito.reduce((sum, p) => sum + p.price * p.cantidad, 0);
  },

  // Getter: Total de unidades (considerando packs)
  getTotalUnidades: () => {
    const { carrito, productosCarrito } = get();
    return carrito.reduce((sum, item) => {
      const prod = productosCarrito.get(item.id);
      const units =
        prod?.unitsPerPackage && prod.unitsPerPackage > 1
          ? prod.unitsPerPackage * item.cantidad
          : item.cantidad;
      return sum + units;
    }, 0);
  },

  // Getter: Cantidad de productos en el carrito
  getCantidadProductos: () => {
    const { carrito } = get();
    return carrito.reduce((sum, item) => sum + item.cantidad, 0);
  },

  // Cargar desde localStorage
  loadFromStorage: () => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        
        // Reconstruir el Map desde el array guardado
        const productosCarrito = new Map();
        if (data.productosCarrito && Array.isArray(data.productosCarrito)) {
          data.productosCarrito.forEach(([key, value]: [number, Producto]) => {
            productosCarrito.set(key, value);
          });
        }

        set({
          carrito: data.carrito || [],
          productosCarrito,
        });
      }
    } catch (error) {
      console.error('Error cargando carrito desde localStorage:', error);
    }
  },

  // Guardar en localStorage (método público)
  saveToStorage: () => {
    const state = get();
    saveToLocalStorage(state);
  },
}));

// Función helper para guardar en localStorage
function saveToLocalStorage(state: Pick<CartStore, 'carrito' | 'productosCarrito'>) {
  if (typeof window === 'undefined') return;

  try {
    // Convertir el Map a array para poder guardarlo en JSON
    const productosCarritoArray = Array.from(state.productosCarrito.entries());
    
    const dataToSave = {
      carrito: state.carrito,
      productosCarrito: productosCarritoArray,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (error) {
    console.error('Error guardando carrito en localStorage:', error);
  }
}