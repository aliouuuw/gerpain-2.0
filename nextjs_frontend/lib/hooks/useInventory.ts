"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getStockLevels,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  adjustStock,
  deleteInventoryItem,
  type CreateInventoryItemRequest,
  type UpdateInventoryItemRequest,
  type AdjustStockRequest,
} from "@/lib/api/inventory";

const INVENTORY_KEY = "inventory";

export function useStockLevels(locationId?: string, productId?: string, lowStock?: boolean) {
  return useQuery({
    queryKey: [INVENTORY_KEY, "stock", { locationId, productId, lowStock }],
    queryFn: () => getStockLevels(locationId, productId, lowStock),
  });
}

export function useInventoryItem(id: string) {
  return useQuery({
    queryKey: [INVENTORY_KEY, id],
    queryFn: () => getInventoryItem(id),
    enabled: !!id,
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInventoryItemRequest) => createInventoryItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEY] });
    },
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInventoryItemRequest }) =>
      updateInventoryItem(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEY] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEY, variables.id] });
    },
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdjustStockRequest }) =>
      adjustStock(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEY] });
    },
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteInventoryItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEY] });
    },
  });
}
