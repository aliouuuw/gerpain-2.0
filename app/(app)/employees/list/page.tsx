"use client";

import { useState, useEffect } from "react";
import { Plus, Search, User, Mail, Phone, MapPin, Pencil, UserX, UserCheck } from "lucide-react";

import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader } from "@/components/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, type SelectOption } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeactivateEmployee, useReactivateEmployee, useEmployeeProducts, useUpdateEmployeeProducts } from "@/lib/hooks/useEmployees";
import { useLocations } from "@/lib/hooks/useLocations";
import { useProducts } from "@/lib/hooks/useProducts";
import type { Employee, EmployeeRole, EmployeeStatus } from "@/lib/api/employees";

const roleLabels: Record<EmployeeRole, string> = {
  delivery: "Livreur",
  cashier: "Caissier",
  manager: "Manager",
  baker: "Boulanger",
};

const roleOptions: SelectOption[] = [
  { value: "all", label: "Tous les rôles" },
  { value: "delivery", label: "Livreur" },
  { value: "cashier", label: "Caissier" },
  { value: "manager", label: "Manager" },
  { value: "baker", label: "Boulanger" },
];

const statusOptions: SelectOption[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "active", label: "Actif" },
  { value: "inactive", label: "Inactif" },
];

const emptyFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "delivery" as EmployeeRole,
  status: "active" as EmployeeStatus,
  locations: [] as string[],
  commissionRate: 0,
  baseSalary: 0,
  hireDate: new Date().toISOString().slice(0, 10),
  products: [] as { productId: string; commissionPerUnit: number; isActive: boolean }[],
};

export default function EmployeesListPage() {
  const { notify } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState(emptyFormData);

  // API hooks
  const { data: employees = [], isLoading, error } = useEmployees({
    role: roleFilter !== "all" ? (roleFilter as EmployeeRole) : undefined,
    status: statusFilter !== "all" ? (statusFilter as EmployeeStatus) : undefined,
  });
  const { data: locations = [], isLoading: isLoadingLocations } = useLocations();
  const { data: products = [], isLoading: isLoadingProducts } = useProducts();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deactivateEmployee = useDeactivateEmployee();
  const reactivateEmployee = useReactivateEmployee();
  const { data: employeeProducts = [], isLoading: isLoadingEmployeeProducts } = useEmployeeProducts(editingEmployee?.id || "");
  const updateEmployeeProducts = useUpdateEmployeeProducts();

  // Load employee products into form when editing
  useEffect(() => {
    if (editingEmployee && employeeProducts.length > 0) {
      setFormData((prev) => ({
        ...prev,
        products: employeeProducts.map((ep) => ({
          productId: ep.productId,
          commissionPerUnit: ep.commissionPerUnit ?? 0,
          isActive: ep.isActive ?? true,
        })),
      }));
    }
  }, [editingEmployee, employeeProducts]);

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      searchQuery === "" ||
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (emp.phone?.includes(searchQuery) ?? false);
    const matchesRole = roleFilter === "all" || emp.role === roleFilter;
    const matchesStatus = statusFilter === "all" || emp.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const openAddForm = () => {
    setEditingEmployee(null);
    setFormData(emptyFormData);
    setIsFormOpen(true);
  };

  const openEditForm = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email ?? "",
      phone: employee.phone ?? "",
      role: employee.role,
      status: employee.status,
      locations: employee.locations,
      commissionRate: employee.commissionRate ?? 0,
      baseSalary: employee.baseSalary ?? 0,
      hireDate: employee.hireDate ?? new Date().toISOString().slice(0, 10),
      products: [],
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.firstName || !formData.lastName) {
      notify({
        variant: "error",
        title: "Erreur",
        description: "Le prénom et le nom sont requis.",
      });
      return;
    }

    try {
      let employeeId: string;
      const { products: productAssignments, ...employeeFields } = formData;
      const payload = {
        ...employeeFields,
        email: employeeFields.email || undefined,
        phone: employeeFields.phone || undefined,
        hireDate: employeeFields.hireDate || undefined,
      };
      if (editingEmployee) {
        await updateEmployee.mutateAsync({
          id: editingEmployee.id,
          data: payload,
        });
        employeeId = editingEmployee.id;
      } else {
        const newEmployee = await createEmployee.mutateAsync(payload);
        employeeId = newEmployee.id;
      }

      // Save product assignments if any
      if (formData.products.length > 0) {
        await updateEmployeeProducts.mutateAsync({
          id: employeeId,
          products: formData.products,
        });
      }

      setIsFormOpen(false);
      setEditingEmployee(null);
      setFormData(emptyFormData);
    } catch (error) {
      // Error handling is done in the hooks
      console.error("Failed to save employee:", error);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await deactivateEmployee.mutateAsync(id);
    } catch (error) {
      console.error("Failed to deactivate employee:", error);
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await reactivateEmployee.mutateAsync(id);
    } catch (error) {
      console.error("Failed to reactivate employee:", error);
    }
  };

  const locationOptions = locations.map((loc) => ({
    value: loc.id,
    label: loc.name,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Liste des employés
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Gérez les informations, rôles et affectations de votre équipe
          </p>
        </div>
        <Button onClick={openAddForm}>
          <Plus className="size-4" />
          Ajouter un employé
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, email, téléphone..."
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] py-2 pl-10 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={roleFilter}
                onValueChange={(val) => setRoleFilter(Array.isArray(val) ? val[0] : val)}
                options={roleOptions}
                placeholder="Rôle"
                className="w-40"
              />
              <Select
                value={statusFilter}
                onValueChange={(val) => setStatusFilter(Array.isArray(val) ? val[0] : val)}
                options={statusOptions}
                placeholder="Statut"
                className="w-40"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow variant="header">
                <TableHead>Employé</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Localisations</TableHead>
                <TableHead numeric>Commission</TableHead>
                <TableHead>Date d&apos;embauche</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading || isLoadingLocations ? (
                <TableEmptyState
                  colSpan={7}
                  message="Chargement des employés..."
                />
              ) : error ? (
                <TableEmptyState
                  colSpan={7}
                  message="Erreur lors du chargement des employés"
                  action={
                    <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
                      Réessayer
                    </Button>
                  }
                />
              ) : filteredEmployees.length === 0 ? (
                <TableEmptyState
                  colSpan={7}
                  message="Aucun employé trouvé"
                  action={
                    <Button size="sm" variant="secondary" onClick={openAddForm}>
                      Ajouter un employé
                    </Button>
                  }
                />
              ) : (
                filteredEmployees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-[var(--primary)]">
                          <User className="size-5" />
                        </div>
                        <div>
                          <p className="font-medium text-[var(--foreground)]">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                            <span className="flex items-center gap-1">
                              <Mail className="size-3" />
                              {emp.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="size-3" />
                              {emp.phone}
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="info">{roleLabels[emp.role]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={emp.status === "active" ? "success" : "default"}>
                        {emp.status === "active" ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {emp.locations.map((locId) => {
                          const loc = locations.find((l) => l.id === locId);
                          return loc ? (
                            <span
                              key={locId}
                              className="inline-flex items-center gap-1 rounded bg-[var(--secondary)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]"
                            >
                              <MapPin className="size-3" />
                              {loc.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </TableCell>
                    <TableCell numeric>{emp.commissionRate}%</TableCell>
                    <TableCell>
                      {emp.hireDate
                        ? new Date(emp.hireDate).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditForm(emp)}
                          aria-label="Modifier"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => emp.status === "active" ? handleDeactivate(emp.id) : handleReactivate(emp.id)}
                          aria-label={emp.status === "active" ? "Désactiver" : "Réactiver"}
                          disabled={deactivateEmployee.isPending || reactivateEmployee.isPending}
                        >
                          {emp.status === "active" ? (
                            <UserX className="size-4 text-[var(--error)]" />
                          ) : (
                            <UserCheck className="size-4 text-[var(--success)]" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? "Modifier l'employé" : "Ajouter un employé"}
            </DialogTitle>
            <DialogDescription>
              {editingEmployee
                ? `Modification de ${editingEmployee.firstName} ${editingEmployee.lastName}`
                : "Renseignez les informations du nouvel employé"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Prénom *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                  placeholder="Prénom"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Nom *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                  placeholder="Nom"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                  placeholder="email@exemple.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                  placeholder="+221 77 123 45 67"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Rôle
                </label>
                <Select
                  value={formData.role}
                  onValueChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      role: (Array.isArray(val) ? val[0] : val) as EmployeeRole,
                    }))
                  }
                  options={roleOptions.filter((o) => o.value !== "all")}
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Statut
                </label>
                <Select
                  value={formData.status}
                  onValueChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: (Array.isArray(val) ? val[0] : val) as EmployeeStatus,
                    }))
                  }
                  options={statusOptions.filter((o) => o.value !== "all")}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)]">
                Localisations
              </label>
              <Select
                value={formData.locations}
                onValueChange={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    locations: Array.isArray(val) ? val : [val],
                  }))
                }
                options={locationOptions}
                multi
                className="mt-1.5"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Taux de commission (%)
                </label>
                <input
                  type="number"
                  value={formData.commissionRate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, commissionRate: Number(e.target.value) }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Salaire de base (FCFA)
                </label>
                <input
                  type="number"
                  value={formData.baseSalary}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, baseSalary: Number(e.target.value) }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                  min={0}
                  step={1000}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Date d&apos;embauche
                </label>
                <input
                  type="date"
                  value={formData.hireDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, hireDate: e.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Product Assignment Panel */}
            <div className="border-t border-[var(--border)] pt-4">
              <label className="block text-sm font-medium text-[var(--foreground)] mb-3">
                Produits assignés
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {isLoadingProducts ? (
                  <p className="text-sm text-[var(--muted-foreground)]">Chargement des produits...</p>
                ) : products.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">Aucun produit disponible</p>
                ) : (
                  products.map((product) => {
                    const assignment = formData.products.find((p) => p.productId === product.id);
                    const isAssigned = !!assignment;
                    return (
                      <div key={product.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--secondary)]">
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData((prev) => ({
                                ...prev,
                                products: [
                                  ...prev.products,
                                  { productId: product.id, commissionPerUnit: 0, isActive: true },
                                ],
                              }));
                            } else {
                              setFormData((prev) => ({
                                ...prev,
                                products: prev.products.filter((p) => p.productId !== product.id),
                              }));
                            }
                          }}
                          className="size-4 rounded border-[var(--border)]"
                        />
                        <span className="flex-1 text-sm">{product.name}</span>
                        {isAssigned && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[var(--muted-foreground)]">Commission:</span>
                            <input
                              type="number"
                              value={assignment.commissionPerUnit}
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                setFormData((prev) => ({
                                  ...prev,
                                  products: prev.products.map((p) =>
                                    p.productId === product.id ? { ...p, commissionPerUnit: value } : p
                                  ),
                                }));
                              }}
                              className="w-20 rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-sm"
                              min={0}
                              step={10}
                              placeholder="FCFA"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsFormOpen(false)} disabled={createEmployee.isPending || updateEmployee.isPending}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={createEmployee.isPending || updateEmployee.isPending}>
              {createEmployee.isPending || updateEmployee.isPending
                ? "Enregistrement..."
                : editingEmployee
                  ? "Enregistrer"
                  : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
