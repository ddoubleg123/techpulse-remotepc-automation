import { create } from "zustand";
import { persist } from "zustand/middleware";


interface User {
  id: string;
  email: string;
  name: string;
  hasPaymentMethodOnFile: boolean;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  businessName?: string;
  businessAddress?: string;
  photoUrl?: string;
  onboarding_completed?: boolean;
}


interface Device {
  id: string;
  name: string;
  status: "online" | "offline";
  lastSeen: string;
}


interface AuthState {
  user: User | null;
  token: string | null;
  devices: Device[];
  signIn: (user: User, token: string) => void;
  signOut: () => void;
  updateDevices: (devices: Device[]) => void;
}


export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      devices: [
        {
          id: "1",
          name: "Main Diagnostic Laptop",
          status: "online",
          lastSeen: "2 minutes ago"
        }
      ],
      signIn: (user, token) => set({ user, token }),
      signOut: () => set({ user: null, token: null, devices: [] }),
      updateDevices: (devices) => set({ devices }),
    }),
    {
      name: "auth-storage",
    }
  )
);
