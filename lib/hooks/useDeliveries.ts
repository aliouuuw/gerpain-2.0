"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import {
  getDeliveryRuns,
  getDeliveryRun,
  createDeliveryRun,
  updateDeliveryRun,
  validateDeliveryRun,
  createDeliveryItem,
  updateDeliveryItem,
  deleteDeliveryItem,
  type DeliveryRunsParams,
  type CreateDeliveryRunRequest,
  type UpdateDeliveryRunRequest,
  type CreateDeliveryItemRequest,
  type UpdateDeliveryItemRequest,
} from "@/lib/api/deliveries";

export const deliveryKeys = {
  all: ["deliveries"] as const,
  runs: (params: DeliveryRunsParams) => [...deliveryKeys.all, "runs", params] as const,
  run: (id: string) => [...deliveryKeys.all, "run", id] as const,
};

export function useDeliveryRuns(params: DeliveryRunsParams) {
  return useQuery({
    queryKey: deliveryKeys.runs(params),
    queryFn: () => getDeliveryRuns(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDeliveryRun(id: string) {
  return useQuery({
    queryKey: deliveryKeys.run(id),
    queryFn: () => getDeliveryRun(id),
    enabled: !!id,
  });
}

export function useCreateDeliveryRun() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: (data: CreateDeliveryRunRequest) => createDeliveryRun(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      notify({
        variant: "success",
        title: "Tournée créée",
        description: "La tournée a été créée avec succès.",
      });
    },
    onError: () => {
      notify({
        variant: "error",
        title: "Erreur",
        description: "Impossible de créer la tournée.",
      });
    },
  });
}

export function useUpdateDeliveryRun() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDeliveryRunRequest }) =>
      updateDeliveryRun(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.run(variables.id) });
      notify({
        variant: "success",
        title: "Tournée mise à jour",
      });
    },
    onError: () => {
      notify({
        variant: "error",
        title: "Erreur",
        description: "Impossible de mettre à jour la tournée.",
      });
    },
  });
}

export function useValidateDeliveryRun() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: (id: string) => validateDeliveryRun(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      const expectedAmount = data?.collection?.expectedAmount || 0;
      notify({
        variant: "success",
        title: "Tournée validée",
        description: `Collecte de ${expectedAmount.toLocaleString()} FCFA créée automatiquement`,
        action: {
          label: "Voir les collectes",
          onClick: () => {
            window.location.href = "/cash/collections";
          },
        },
      });
    },
    onError: () => {
      notify({
        variant: "error",
        title: "Erreur",
        description: "Impossible de valider la tournée.",
      });
    },
  });
}

export function useCreateDeliveryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ runId, data }: { runId: string; data: CreateDeliveryItemRequest }) =>
      createDeliveryItem(runId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.run(variables.runId) });
    },
  });
}

export function useUpdateDeliveryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDeliveryItemRequest }) =>
      updateDeliveryItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
    },
  });
}

export function useDeleteDeliveryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDeliveryItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
    },
  });
}
