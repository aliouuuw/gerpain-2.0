"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import {
  getCashCollections,
  getCashCollection,
  getCollectionAggregates,
  getCashCollectionsOverview,
  createCashCollection,
  updateCashCollection,
  submitCashCollection,
  validateCashCollection,
  rejectCashCollection,
  settleCollectionsPeriod,
  type CollectionsParams,
  type CreateCashCollectionRequest,
  type UpdateCashCollectionRequest,
  type OverviewParams,
} from "@/lib/api/collections";

export const collectionKeys = {
  all: ["collections"] as const,
  list: (params: CollectionsParams) => [...collectionKeys.all, "list", params] as const,
  detail: (id: string) => [...collectionKeys.all, "detail", id] as const,
  aggregates: (params: Omit<CollectionsParams, "status" | "locationId" | "isSettled">) =>
    [...collectionKeys.all, "aggregates", params] as const,
  overview: (params: OverviewParams) => [...collectionKeys.all, "overview", params] as const,
};

export function useCashCollections(params: CollectionsParams) {
  return useQuery({
    queryKey: collectionKeys.list(params),
    queryFn: () => getCashCollections(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCashCollection(id: string) {
  return useQuery({
    queryKey: collectionKeys.detail(id),
    queryFn: () => getCashCollection(id),
    enabled: !!id,
  });
}

export function useCreateCashCollection() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: (data: CreateCashCollectionRequest) => createCashCollection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
      notify({
        variant: "success",
        title: "Collecte créée",
      });
    },
    onError: () => {
      notify({
        variant: "error",
        title: "Erreur",
        description: "Impossible de créer la collecte.",
      });
    },
  });
}

export function useUpdateCashCollection() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCashCollectionRequest }) =>
      updateCashCollection(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
      queryClient.invalidateQueries({ queryKey: collectionKeys.detail(variables.id) });
      notify({
        variant: "success",
        title: "Collecte mise à jour",
      });
    },
    onError: () => {
      notify({
        variant: "error",
        title: "Erreur",
        description: "Impossible de mettre à jour la collecte.",
      });
    },
  });
}

export function useSubmitCashCollection() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: (id: string) => submitCashCollection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
      notify({
        variant: "success",
        title: "Collecte soumise",
        description: "La collecte a été soumise pour validation.",
      });
    },
    onError: () => {
      notify({
        variant: "error",
        title: "Erreur",
        description: "Impossible de soumettre la collecte.",
      });
    },
  });
}

export function useValidateCashCollection() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: (id: string) => validateCashCollection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
      notify({
        variant: "success",
        title: "Collecte validée",
      });
    },
    onError: () => {
      notify({
        variant: "error",
        title: "Erreur",
        description: "Impossible de valider la collecte.",
      });
    },
  });
}

export function useRejectCashCollection() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectCashCollection(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
      notify({
        variant: "warning",
        title: "Collecte rejetée",
        description: "La collecte doit être corrigée.",
      });
    },
    onError: () => {
      notify({
        variant: "error",
        title: "Erreur",
        description: "Impossible de rejeter la collecte.",
      });
    },
  });
}

export function useCollectionAggregates(
  params: Omit<CollectionsParams, "status" | "locationId" | "isSettled"> = {}
) {
  return useQuery({
    queryKey: collectionKeys.aggregates(params),
    queryFn: () => getCollectionAggregates(params),
    staleTime: 30 * 1000,
  });
}

export function useSettleCollectionsPeriod() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: (params: Omit<CollectionsParams, "status" | "locationId" | "isSettled">) =>
      settleCollectionsPeriod(params),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
      notify({
        variant: "success",
        title: "Période réglée",
        description: `${data.settledCount} collecte(s) marquée(s) comme réglée(s).`,
      });
    },
    onError: () => {
      notify({
        variant: "error",
        title: "Erreur",
        description: "Impossible de régler la période.",
      });
    },
  });
}

export function useCashCollectionsOverview(params: OverviewParams = {}) {
  return useQuery({
    queryKey: collectionKeys.overview(params),
    queryFn: () => getCashCollectionsOverview(params),
    staleTime: 30 * 1000,
  });
}
