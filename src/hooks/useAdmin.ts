/**
 * React Query hooks para o painel admin.
 * Queries + mutations com invalidação de cache.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchDashboardStats,
  fetchAdminProducts,
  fetchAdminProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
  addProductSize,
  updateStock,
  batchUpdateStock,
  deleteProductSize,
  addProductImage,
  deleteProductImage,
  fetchAdminOrders,
  fetchAdminOrder,
  updateOrderStatus,
  updateOrderNotes,
  updateTrackingCode,
  type ProductFormData,
  type StockUpdate,
} from "@/lib/admin-api";
import type { OrderStatus } from "@/types/database";

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function useDashboardStats() {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: fetchDashboardStats,
    refetchInterval: 60_000, // atualizar a cada 1 min
  });
}

// ─── Products ────────────────────────────────────────────────────────────────

export function useAdminProducts() {
  return useQuery({
    queryKey: ["admin", "products"],
    queryFn: fetchAdminProducts,
  });
}

export function useAdminProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "products", id],
    queryFn: () => fetchAdminProduct(id!),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: ProductFormData) => createProduct(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] }); // front-end cache
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, form }: { id: string; form: Partial<ProductFormData> }) =>
      updateProduct(id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useRestoreProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// ─── Stock ───────────────────────────────────────────────────────────────────

export function useAddProductSize() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      sizeLabel,
      stock,
      sku,
    }: {
      productId: string;
      sizeLabel: string;
      stock: number;
      sku?: string;
    }) => addProductSize(productId, sizeLabel, stock, sku),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });
}

export function useUpdateStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sizeId, stock }: { sizeId: string; stock: number }) =>
      updateStock(sizeId, stock),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

export function useBatchUpdateStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates: StockUpdate[]) => batchUpdateStock(updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

export function useDeleteProductSize() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sizeId: string) => deleteProductSize(sizeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });
}

// ─── Images ──────────────────────────────────────────────────────────────────

export function useAddProductImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      url,
      altText,
      position,
    }: {
      productId: string;
      url: string;
      altText: string;
      position: number;
    }) => addProductImage(productId, url, altText, position),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });
}

export function useDeleteProductImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) => deleteProductImage(imageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export function useAdminOrders() {
  return useQuery({
    queryKey: ["admin", "orders"],
    queryFn: fetchAdminOrders,
  });
}

export function useAdminOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "orders", id],
    queryFn: () => fetchAdminOrder(id!),
    enabled: !!id,
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      status,
      note,
    }: {
      orderId: string;
      status: OrderStatus;
      note?: string;
    }) => updateOrderStatus(orderId, status, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

export function useUpdateOrderNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, notes }: { orderId: string; notes: string }) =>
      updateOrderNotes(orderId, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
  });
}

export function useUpdateTrackingCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, trackingCode }: { orderId: string; trackingCode: string }) =>
      updateTrackingCode(orderId, trackingCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
  });
}
