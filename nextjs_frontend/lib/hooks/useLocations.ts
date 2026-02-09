"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import {
  getLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
  type CreateLocationRequest,
  type UpdateLocationRequest,
} from "@/lib/api/locations";

export const locationKeys = {
  all: ["locations"] as const,
  list: () => [...locationKeys.all, "list"] as const,
  detail: (id: string) => [...locationKeys.all, "detail", id] as const,
};

export function useLocations() {
  return useQuery({
    queryKey: locationKeys.list(),
    queryFn: () => getLocations(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLocation(id: string) {
  return useQuery({
    queryKey: locationKeys.detail(id),
    queryFn: () => getLocation(id),
    enabled: !!id,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: (data: CreateLocationRequest) => createLocation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all });
      notify({
        variant: "success",
        title: "Localisation créée",
        description: "La localisation a été créée avec succès.",
      });
    },
    onError: () => {
      notify({
        variant: "error",
        title: "Erreur",
        description: "Impossible de créer la localisation.",
      });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLocationRequest }) =>
      updateLocation(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all });
      queryClient.invalidateQueries({ queryKey: locationKeys.detail(variables.id) });
      notify({
        variant: "success",
        title: "Localisation mise à jour",
        description: "Les modifications ont été enregistrées.",
      });
    },
    onError: () => {
      notify({
        variant: "error",
        title: "Erreur",
        description: "Impossible de modifier la localisation.",
      });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteLocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all });
      notify({
        variant: "success",
        title: "Localisation supprimée",
        description: "La localisation a été supprimée.",
      });
    },
    onError: () => {
      notify({
        variant: "error",
        title: "Erreur",
        description: "Impossible de supprimer la localisation.",
      });
    },
  });
}
