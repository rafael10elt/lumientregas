export type UserRole = "superadmin" | "admin" | "motorista";
export type UserStatus = "active" | "inactive";
export type DriverStatus = "available" | "busy" | "offline";
export type DeliveryStatus = "pendente" | "em_rota" | "entregue" | "cancelado";
export type DeliveryEventType = "status_change";
export type TenantStatus = "active" | "suspended";
export type TenantPaymentStatus = "ok" | "pending" | "overdue";

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
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  status: UserStatus;
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
  status?: UserStatus;
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
  notes: string | null;
  status: DriverStatus;
  vehicles?: DriverVehicle[];
  createdAt: Date;
  updatedAt: Date;
};

export type DriverVehicle = {
  id: string;
  tenantId: string;
  currentDriverId: string | null;
  model: string;
  plate: string;
  nickname: string | null;
  isPrimary: boolean;
  lastAssignedAt: Date | null;
  lastUnassignedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertDriverVehicle = {
  tenantId?: string;
  currentDriverId?: string | null;
  model: string;
  plate: string;
  nickname?: string | null;
  isPrimary?: boolean;
  lastAssignedAt?: Date | string | null;
  lastUnassignedAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type VehicleAssignment = {
  id: string;
  tenantId: string;
  vehicleId: string;
  driverId: string;
  assignedByUserId: string | null;
  assignedAt: Date;
  unassignedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertVehicleAssignment = {
  tenantId?: string;
  vehicleId: string;
  driverId: string;
  assignedByUserId?: string | null;
  assignedAt?: Date | string;
  unassignedAt?: Date | string | null;
  notes?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type Client = {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertClient = {
  name: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type ClientBase = {
  id: string;
  clientId: string;
  name: string;
  postalCode: string | null;
  street: string;
  number: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  complement: string | null;
  reference: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type OperationalBase = {
  id: string;
  tenantId: string;
  name: string;
  postalCode: string | null;
  street: string;
  number: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  complement: string | null;
  reference: string | null;
  latitude: string | null;
  longitude: string | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertClientBase = {
  clientId: string;
  name: string;
  postalCode?: string | null;
  street: string;
  number?: string | null;
  neighborhood?: string | null;
  city: string;
  state: string;
  complement?: string | null;
  reference?: string | null;
  isDefault?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type InsertDriver = {
  tenantId?: string;
  userId?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  status?: DriverStatus;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type InsertOperationalBase = {
  tenantId?: string;
  name: string;
  postalCode?: string | null;
  street: string;
  number?: string | null;
  neighborhood?: string | null;
  city: string;
  state: string;
  complement?: string | null;
  reference?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  isPrimary?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type Delivery = {
  id: string;
  clientId: string | null;
  baseId: string | null;
  clientName: string;
  clientPhone: string | null;
  originPostalCode: string | null;
  originAddress: string;
  originStreet: string | null;
  originNumber: string | null;
  originNeighborhood: string | null;
  originCity: string | null;
  originState: string | null;
  originComplement: string | null;
  originLat: string | null;
  originLng: string | null;
  destinationPostalCode: string | null;
  destinationAddress: string;
  destinationStreet: string | null;
  destinationNumber: string | null;
  destinationNeighborhood: string | null;
  destinationCity: string | null;
  destinationState: string | null;
  destinationComplement: string | null;
  destinationLat: string | null;
  destinationLng: string | null;
  driverId: string | null;
  createdByUserId: string | null;
  status: DeliveryStatus;
  routeOrder: number | null;
  scheduledAt: Date | null;
  notes: string | null;
  distance: string | null;
  estimatedTime: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DeliveryEvent = {
  id: string;
  tenantId: string;
  deliveryId: string;
  driverId: string | null;
  createdByUserId: string | null;
  eventType: DeliveryEventType;
  fromStatus: DeliveryStatus | null;
  toStatus: DeliveryStatus;
  latitude: string | null;
  longitude: string | null;
  accuracy: string | null;
  metadata: Record<string, unknown> | null;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertDelivery = {
  tenantId?: string;
  clientId?: string | null;
  baseId?: string | null;
  clientName: string;
  clientPhone?: string | null;
  originPostalCode?: string | null;
  originAddress: string;
  originStreet?: string | null;
  originNumber?: string | null;
  originNeighborhood?: string | null;
  originCity?: string | null;
  originState?: string | null;
  originComplement?: string | null;
  originLat?: string | null;
  originLng?: string | null;
  destinationPostalCode?: string | null;
  destinationAddress: string;
  destinationStreet?: string | null;
  destinationNumber?: string | null;
  destinationNeighborhood?: string | null;
  destinationCity?: string | null;
  destinationState?: string | null;
  destinationComplement?: string | null;
  destinationLat?: string | null;
  destinationLng?: string | null;
  driverId?: string | null;
  createdByUserId?: string | null;
  status?: DeliveryStatus;
  routeOrder?: number | null;
  scheduledAt?: Date | string | null;
  notes?: string | null;
  distance?: string | null;
  estimatedTime?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type InsertDeliveryEvent = {
  tenantId: string;
  deliveryId: string;
  driverId?: string | null;
  createdByUserId?: string | null;
  eventType?: DeliveryEventType;
  fromStatus?: DeliveryStatus | null;
  toStatus: DeliveryStatus;
  latitude?: number | string | null;
  longitude?: number | string | null;
  accuracy?: number | string | null;
  metadata?: Record<string, unknown> | null;
  recordedAt?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};
