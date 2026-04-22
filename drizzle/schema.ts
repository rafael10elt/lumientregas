export type UserRole = "user" | "admin";
export type DriverStatus = "available" | "busy" | "offline";
export type DeliveryStatus = "pendente" | "em_rota" | "entregue" | "cancelado";

export type User = {
  id: number;
  openId: string;
  authUserId: string | null;
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
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  role?: UserRole;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  lastSignedIn?: Date | string;
};

export type Driver = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  vehicle: string | null;
  status: DriverStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertDriver = {
  name: string;
  email?: string | null;
  phone?: string | null;
  vehicle?: string | null;
  status?: DriverStatus;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type Delivery = {
  id: number;
  clientName: string;
  originPostalCode: string | null;
  originAddress: string;
  originLat: string | null;
  originLng: string | null;
  destinationPostalCode: string | null;
  destinationAddress: string;
  destinationLat: string | null;
  destinationLng: string | null;
  driverId: number | null;
  createdByUserId: number | null;
  status: DeliveryStatus;
  scheduledAt: Date | null;
  notes: string | null;
  distance: string | null;
  estimatedTime: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertDelivery = {
  clientName: string;
  originPostalCode?: string | null;
  originAddress: string;
  originLat?: string | null;
  originLng?: string | null;
  destinationPostalCode?: string | null;
  destinationAddress: string;
  destinationLat?: string | null;
  destinationLng?: string | null;
  driverId?: number | null;
  createdByUserId?: number | null;
  status?: DeliveryStatus;
  scheduledAt?: Date | string | null;
  notes?: string | null;
  distance?: string | null;
  estimatedTime?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};
