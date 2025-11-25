// Business domain types for Gerpain ERP

export interface Product {
  id: string;
  name: string;
  unit: string;
  unitPrice: number;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Location {
  id: string;
  name: string;
  type: string;
  chainId: string;
}

export interface DeliveryItem {
  id: string;
  productId: string;
  quantityOut: number;
  quantityReturned: number;
  unitPrice: number;
}

export interface DeliveryRun {
  id: string;
  employeeId: string;
  date: string;
  locationName: string;
  status: "draft" | "in_progress" | "validated";
  notes: string;
  items: DeliveryItem[];
}
