"use client";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Upload, Image as ImageIcon, Star } from "lucide-react";
import { useEffect } from "react";

// Esquema corregido para manejar valores por defecto y el campo active y favorito
const productSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres").max(60, "Máximo 60 caracteres"),
  description: z.string().nullable().optional(),
  price: z.number().min(0.01, "El precio debe ser mayor a 0"),
  isGroup: z.boolean(),
  unitsPerPackage: z.number().optional(),
  image: z.any().optional(),
  active: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
}).refine((data) => {
  if (data.isGroup && (!data.unitsPerPackage || data.unitsPerPackage < 2)) {
    return false;
  }
  return true;
}, {
  message: "Si es un grupo/pack, debe tener al menos 2 unidades",
  path: ["unitsPerPackage"],
});

type ProductForm = z.infer<typeof productSchema>;

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

interface ProductModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProductForm) => Promise<void>;
  initialData?: Partial<Producto>;
  isEdit?: boolean;
}

export function ProductModal({ open, onClose, onSubmit, initialData, isEdit = false }: ProductModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      isGroup: false,
      unitsPerPackage: 1,
      image: undefined,
      active: true,
      isFavorite: false,
      ...(initialData && {
        name: initialData.name ?? "",
        description: initialData.description ?? "",
        price: initialData.price ?? 0,
        isGroup: initialData.unitsPerPackage && initialData.unitsPerPackage > 1 ? true : false,
        unitsPerPackage: initialData.unitsPerPackage ?? 1,
        active: initialData.active ?? true,
        isFavorite: initialData.isFavorite ?? false,
      }),
    },
  });

  const isGroup = watch("isGroup");
  const isFavorite = watch("isFavorite");

  // Efecto para cargar los datos iniciales cuando se abre el modal
  useEffect(() => {
    if (open) {
      if (isEdit && initialData) {
        setValue("name", initialData.name || "");
        setValue("description", initialData.description || "");
        setValue("price", initialData.price || 0);
        setValue("isGroup", (initialData.unitsPerPackage && initialData.unitsPerPackage > 1) || false);
        setValue("unitsPerPackage", initialData.unitsPerPackage || 1);
        setValue("active", initialData.active ?? true);
        setValue("isFavorite", initialData.isFavorite ?? false);
      } else {
        setValue("name", "");
        setValue("description", "");
        setValue("price", 0);
        setValue("isGroup", false);
        setValue("unitsPerPackage", 1);
        setValue("active", true);
        setValue("isFavorite", false);
      }
    }
  }, [open, isEdit, initialData, setValue]);

  const handleFormSubmit: SubmitHandler<ProductForm> = async (data) => {
    // Convertir strings a números si es necesario
    const processedData = {
      ...data,
      price: Number(data.price),
      unitsPerPackage: data.unitsPerPackage ? Number(data.unitsPerPackage) : undefined,
    };

    if (!processedData.isGroup) {
      processedData.unitsPerPackage = 1;
    }
    if (!isEdit) {
      processedData.active = true;
    }
    await onSubmit(processedData);
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            {isEdit ? "Editar producto" : "Nuevo producto"}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
          {/* Imagen actual (solo en edición) */}
          {isEdit && initialData?.images?.small && (
            <div className="text-center">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imagen actual
              </label>
              <div className="flex justify-center">
                <img
                  src={initialData.images.small}
                  alt={initialData.name}
                  className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200"
                />
              </div>
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              {...register("name")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nombre del producto"
            />
            {errors.name && (
              <span className="text-red-500 text-xs mt-1">{errors.name.message}</span>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              {...register("description")}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Descripción del producto"
            />
            {errors.description && (
              <span className="text-red-500 text-xs mt-1">{errors.description.message}</span>
            )}
          </div>

          {/* Precio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precio (S/) *
            </label>
            <input
              {...register("price", { valueAsNumber: true })}
              type="number"
              step="0.01"
              min="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
            {errors.price && (
              <span className="text-red-500 text-xs mt-1">{errors.price.message}</span>
            )}
          </div>

          {/* ¿Es favorito? */}
          <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <input
              type="checkbox"
              {...register("isFavorite")}
              id="isFavorite"
              className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500"
            />
            <label htmlFor="isFavorite" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Star size={16} className={isFavorite ? "text-yellow-400 fill-current" : "text-gray-400"} />
              Marcar como favorito
            </label>
          </div>

          {/* ¿Es grupo/pack/caja? */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              {...register("isGroup")}
              id="isGroup"
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="isGroup" className="text-sm font-medium text-gray-700">
              ¿Este producto es un grupo/pack/caja?
            </label>
          </div>

          {/* Unidades por paquete */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unidades por paquete {isGroup && "*"}
            </label>
            <input
              {...register("unitsPerPackage", { valueAsNumber: true })}
              type="number"
              min={isGroup ? 2 : 1}
              disabled={!isGroup}
              className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                !isGroup ? "bg-gray-100 text-gray-500" : ""
              }`}
              placeholder={isGroup ? "Mínimo 2" : "1"}
            />
            {errors.unitsPerPackage && (
              <span className="text-red-500 text-xs mt-1">{errors.unitsPerPackage.message}</span>
            )}
            {!isGroup && (
              <p className="text-xs text-gray-500 mt-1">
                Se asumirá como 1 unidad al no ser un grupo
              </p>
            )}
          </div>

          {/* Imagen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEdit ? "Cambiar imagen (opcional)" : "Imagen *"}
            </label>
            <div className="relative">
              <input
                {...register("image")}
                type="file"
                accept="image/*"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute right-2 top-2 pointer-events-none">
                {isEdit ? <Upload size={16} className="text-gray-400" /> : <ImageIcon size={16} className="text-gray-400" />}
              </div>
            </div>
            {!isEdit && errors.image && (
              <span className="text-red-500 text-xs mt-1">La imagen es obligatoria</span>
            )}
            {isEdit && (
              <p className="text-xs text-gray-500 mt-1">
                Deja vacío si no quieres cambiar la imagen actual
              </p>
            )}
          </div>

          {/* Checkbox de activo solo en edición */}
          {isEdit && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                {...register("active")}
                id="active"
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                defaultChecked={initialData?.active}
              />
              <label htmlFor="active" className="text-sm font-medium text-gray-700">
                Producto activo
              </label>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear producto"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}