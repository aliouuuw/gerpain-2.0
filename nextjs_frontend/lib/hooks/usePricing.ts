"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPricingRules,
  getPricingRule,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  type CreatePricingRuleRequest,
  type UpdatePricingRuleRequest,
} from "@/lib/api/pricing";

const PRICING_KEY = "pricing";

export function usePricingRules(productId?: string, locationId?: string) {
  return useQuery({
    queryKey: [PRICING_KEY, { productId, locationId }],
    queryFn: () => getPricingRules(productId, locationId),
  });
}

export function usePricingRule(id: string) {
  return useQuery({
    queryKey: [PRICING_KEY, id],
    queryFn: () => getPricingRule(id),
    enabled: !!id,
  });
}

export function useCreatePricingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePricingRuleRequest) => createPricingRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRICING_KEY] });
    },
  });
}

export function useUpdatePricingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePricingRuleRequest }) =>
      updatePricingRule(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PRICING_KEY] });
      queryClient.invalidateQueries({ queryKey: [PRICING_KEY, variables.id] });
    },
  });
}

export function useDeletePricingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePricingRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRICING_KEY] });
    },
  });
}
