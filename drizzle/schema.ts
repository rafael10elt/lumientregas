export type UserRole = "superadmin" | "admin" | "motorista";
export type DriverStatus = "available" | "busy" | "offline";
export type DeliveryStatus = "pendente" | "em_rota" | "entregue" | "cancelado";
export type TenantStatus = "active" | "suspended";
export type TenantPaymentStatus = "ok" | "pending" | "overdue";

export type AddressFields = {
  postalCode: string | null;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  complement: string | null;
  reference: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: TenantStatus;
  paymentStatus: TenantPaymentStatus;
  paymentDueAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertTenant = {
  name: string;
  slug: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  status?: TenantStatus;
  paymentStatus?: TenantPaymentStatus;
  paymentDueAt?: Date | string | null;
  notes?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type User = {
  id: string;
  openId: string;
  authUserId: string | null;
  tenantId: string | null;
  tenantName: string | null;
  tenantStatus: TenantStatus | null;
  tenantPaymentStatus: TenantPaymentStatus | null;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

export type InsertUser = {
  openId: string;
  authUserId?: string | null;
  tenantId?: string | null;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  role?: UserRole;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  lastSignedIn?: Date | string;
};

export type Driver = {
  id: string;
  tenantId: string;
  userId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  status: DriverStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertDriver = {
  tenantId: string;
  userId?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  status?: DriverStatus;
  notes?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type DriverVehicle = {
  id: string;
  tenantId: string;
  driverId: string;
  model: string;
  plate: string;
  nickname: string | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertDriverVehicle = {
  tenantId: string;
  driverId: string;
  model: string;
  plate: string;
  nickname?: string | null;
  isPrimary?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type Client = {
  id: string;
  tenantId: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertClient = {
  tenantId: string;
  name: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type ClientBase = {
  id: string;
  tenantId: string;
  clientId: string;
  name: string;
  isDefault: boolean;
} & AddressFields & {
  createdAt: Date;
  updatedAt: Date;
};

export type InsertClientBase = {
  tenantId: string;
  clientId: string;
  name: string;
  isDefault?: boolean;
} & Partial<AddressFields> & {
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type Delivery = {
  id: string;
  tenantId: string;
  clientId: string | null;
  clientName: string;
  baseId: string | null;
  originPostalCode: string | null;
  originStreet: string | null;
  originNumber: string | null;
  originNeighborhood: string | null;
  originCity: string | null;
  originState: string | null;
  originComplement: string | null;
  originReference: string | null;
  originLatitude: number | null;
  originLongitude: number | null;
  originAddress: string;
  destinationPostalCode: string | null;
  destinationStreet: string | null;
  destinationNumber: string | null;
  destinationNeighborhood: string | null;
  destinationCity: string | null;
  destinationState: string | null;
  destinationComplement: string | null;
  destinationReference: string | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  destinationAddress: string;
  driverId: string | null;
  createdByUserId: string | null;
  status: DeliveryStatus;
  scheduledAt: Date | null;
  notes: string | null;
  distance: string | null;
  estimatedTime: string | null;
  routeOrder: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertDelivery = {
  tenantId: string;
  clientId?: string | null;
  clientName: string;
  baseId?: string | null;
  originPostalCode?: string | null;
  originStreet?: string | null;
  originNumber?: string | null;
  originNeighborhood?: string | null;
  originCity?: string | null;
  originState?: string | null;
  originComplement?: string | null;
  originReference?: string | null;
  originLatitude?: number | null;
  originLongitude?: number | null;
  originAddress: string;
  destinationPostalCode?: string | null;
  destinationStreet?: string | null;
  destinationNumber?: string | null;
  destinationNeighborhood?: string | null;
  destinationCity?: string | null;
  destinationState?: string | null;
  destinationComplement?: string | null;
  destinationReference?: string | null;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
  destinationAddress: string;
  driverId?: string | null;
  createdByUserId?: string | null;
  status?: DeliveryStatus;
  scheduledAt?: Date | string | null;
  notes?: string | null;
  distance?: string | null;
  estimatedTime?: string | null;
  routeOrder?: number | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};
