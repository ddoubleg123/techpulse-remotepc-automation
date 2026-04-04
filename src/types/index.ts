export interface User {
  id: string;
  email: string;
  name: string;
  hasPaymentMethodOnFile: boolean;
}

export interface Device {
  id: string;
  name: string;
  status: "online" | "offline";
  lastSeen: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: "info" | "warning" | "error" | "success";
}

export interface DiagnosticSession {
  id: string;
  vin: string;
  vehicleMake: string;
  vehicleModel: string;
  year: number;
  createdAt: string;
  status: "pending" | "completed" | "failed";
  findings: string[];
  dtcCodes: string[];
  severity: "low" | "medium" | "high";
}

export interface SyncJob {
  id: string;
  deviceId: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}
