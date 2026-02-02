"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
  reactivateEmployee,
  getEmployeePerformance,
  type EmployeesParams,
  type CreateEmployeeRequest,
  type UpdateEmployeeRequest,
  type PerformanceParams,
} from "@/lib/api/employees";

export const employeeKeys = {
  all: ["employees"] as const,
  list: (params: EmployeesParams) => [...employeeKeys.all, "list", params] as const,
  detail: (id: string) => [...employeeKeys.all, "detail", id] as const,
  performance: (id: string, params: PerformanceParams) =>
    [...employeeKeys.all, "performance", id, params] as const,
};

export function useEmployees(params: EmployeesParams = {}) {
  return useQuery({
    queryKey: employeeKeys.list(params),
    queryFn: () => getEmployees(params),
    staleTime: 10 * 60 * 1000,
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => getEmployee(id),
    enabled: !!id,
  });
}

export function useEmployeePerformance(id: string, params: PerformanceParams) {
  return useQuery({
    queryKey: employeeKeys.performance(id, params),
    queryFn: () => getEmployeePerformance(id, params),
    enabled: !!id && !!params.startDate && !!params.endDate,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: (data: CreateEmployeeRequest) => createEmployee(data),
    onSuccess: (employee) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      notify({
        variant: "success",
        title: "Employé ajouté",
        description: `${employee.firstName} ${employee.lastName} a été ajouté.`,
      });
    },
    onError: () => {
      notify({
        variant: "error",
        title: "Erreur",
        description: "Impossible d'ajouter l'employé.",
      });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeRequest }) =>
      updateEmployee(id, data),
    onSuccess: (employee, variables) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(variables.id) });
      notify({
        variant: "success",
        title: "Employé modifié",
        description: `${employee.firstName} ${employee.lastName} a été mis à jour.`,
      });
    },
    onError: () => {
      notify({
        variant: "error",
        title: "Erreur",
        description: "Impossible de modifier l'employé.",
      });
    },
  });
}

export function useDeactivateEmployee() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: (id: string) => deactivateEmployee(id),
    onSuccess: (employee) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      notify({
        variant: "warning",
        title: "Employé désactivé",
        description: `${employee.firstName} ${employee.lastName} est maintenant inactif.`,
      });
    },
    onError: () => {
      notify({
        variant: "error",
        title: "Erreur",
        description: "Impossible de désactiver l'employé.",
      });
    },
  });
}

export function useReactivateEmployee() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: (id: string) => reactivateEmployee(id),
    onSuccess: (employee) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      notify({
        variant: "success",
        title: "Employé réactivé",
        description: `${employee.firstName} ${employee.lastName} est maintenant actif.`,
      });
    },
    onError: () => {
      notify({
        variant: "error",
        title: "Erreur",
        description: "Impossible de réactiver l'employé.",
      });
    },
  });
}
