export enum UserRole {
  USER = 'user',
  DRIVER = 'driver',
  ADMIN = 'admin',
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: any;
}

export interface DriverProfile {
  uid: string;
  name: string;
  carInfo?: string;
  plate?: string;
  pdpInfo?: string;
  approved: boolean;
  isOnline: boolean;
  lastSeen?: any;
}

export interface Trip {
  id: string;
  userId: string;
  userName: string;
  driverId?: string;
  driverName?: string;
  status: 'Pending' | 'Accepted' | 'Active' | 'Finished' | 'Cancelled';
  priceStatus?: 'Fixed' | 'Proposed' | 'Accepted' | 'Rejected';
  proposedPrice?: number;
  pickup: string;
  destination: string;
  price: number;
  area: string;
  createdAt: any;
  updatedAt: any;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: any;
}

export interface AppSettings {
  openTime: number;
  closeTime: number;
}
