"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import {
  getOrganizations,
  updateOrganization,
  type UpdateOrganizationRequest,
} from "@/lib/api/organization";

export const organizationKeys = {
  all: ["organizations"] as const,
  list: () => [...organizationKeys.all, "list"] as const,
  detail: (id: string) => [...organizationKeys.all, "detail", id] as const,
};

export function useOrganizations() {
  return useQuery({
    queryKey: organizationKeys.list(),
    queryFn: () => getOrganizations(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrganizationRequest }) =>
      updateOrganization(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      notify({
        variant: "success",
        title: "Organisation mise à jour",
        description: "Les modifications ont été enregistrées.",
      });
    },
    onError: () => {
      notify({
        variant: "error",
        title: "Erreur",
        description: "Impossible de modifier l'organisation.",
      });
    },
  });
}
