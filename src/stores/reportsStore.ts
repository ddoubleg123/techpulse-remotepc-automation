import { create } from "zustand";


interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: "info" | "warning" | "error" | "success";
}


interface DiagnosticSession {
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


interface ReportsState {
  notifications: Notification[];
  diagnosticSessions: DiagnosticSession[];
  addNotification: (notification: Omit<Notification, "id">) => void;
  markAsRead: (id: string) => void;
  addDiagnosticSession: (session: Omit<DiagnosticSession, "id">) => void;
}


export const useReportsStore = create<ReportsState>((set) => ({
  notifications: [
    {
      id: "1",
      title: "Sync Complete",
      message: "Successfully synced with 2 devices",
      timestamp: "5 minutes ago",
      read: false,
      type: "success"
    },
    {
      id: "2", 
      title: "New Report Available",
      message: "Diagnostic complete for VIN: 1HGBH41JXMN109186",
      timestamp: "1 hour ago",
      read: false,
      type: "info"
    }
  ],
  diagnosticSessions: [
    {
      id: "1",
      vin: "1HGBH41JXMN109186",
      vehicleMake: "Honda",
      vehicleModel: "Civic",
      year: 2021,
      createdAt: "2024-03-15T10:30:00Z",
      status: "completed",
      findings: ["Engine misfire detected", "O2 sensor performance issue"],
      dtcCodes: ["P0300", "P0420"],
      severity: "medium"
    }
  ],
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        { ...notification, id: Date.now().toString() },
        ...state.notifications,
      ],
    })),
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  addDiagnosticSession: (session) =>
    set((state) => ({
      diagnosticSessions: [
        { ...session, id: Date.now().toString() },
        ...state.diagnosticSessions,
      ],
    })),
}));
