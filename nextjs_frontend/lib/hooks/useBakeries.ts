"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBakeries,
  getBakery,
  getBakeryTierStatus,
  createBakery,
  updateBakery,
  deleteBakery,
  type CreateBakeryRequest,
  type UpdateBakeryRequest,
} from "../api/bakeries";

const BAKERIES_KEY = "bakeries";

export function useBakeries() {
  return useQuery({
    queryKey: [BAKERIES_KEY],
    queryFn: getBakeries,
  });
}

export function useBakery(id: string) {
  return useQuery({
    queryKey: [BAKERIES_KEY, id],
    queryFn: () => getBakery(id),
    enabled: !!id,
  });
}

export function useBakeryTierStatus() {
  return useQuery({
    queryKey: [BAKERIES_KEY, "tier-status"],
    queryFn: getBakeryTierStatus,
  });
}

export function useCreateBakery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBakery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BAKERIES_KEY] });
      queryClient.invalidateQueries({ queryKey: [BAKERIES_KEY, "tier-status"] });
    },
  });
}

export function useUpdateBakery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBakeryRequest }) =>
      updateBakery(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [BAKERIES_KEY] });
      queryClient.invalidateQueries({ queryKey: [BAKERIES_KEY, variables.id] });
    },
  });
}

export function useDeleteBakery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBakery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BAKERIES_KEY] });
    },
  });
}
