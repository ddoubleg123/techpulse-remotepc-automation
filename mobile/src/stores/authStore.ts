import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

interface OTPState {
  code: string;
  email: string;
  expiresAt: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  otpState: OTPState | null;

  // Actions
  setUser: (user: User) => void;
  logout: () => void;
  generateOTP: (email: string) => string;
  verifyOTP: (code: string) => boolean;
  clearOTP: () => void;
}

// Generate a random 6-digit OTP
const generateOTPCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      otpState: null,

      setUser: (user) => set({ user, isAuthenticated: true }),

      logout: () => set({ user: null, isAuthenticated: false, otpState: null }),

      generateOTP: (email) => {
        const code = generateOTPCode();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry
        set({ otpState: { code, email, expiresAt } });
        console.log(`[OTP] Generated code ${code} for ${email} (expires in 5 minutes)`);
        return code;
      },

      verifyOTP: (inputCode) => {
        const { otpState } = get();

        if (!otpState) {
          console.log('[OTP] No OTP state found');
          return false;
        }

        if (Date.now() > otpState.expiresAt) {
          console.log('[OTP] Code expired');
          set({ otpState: null });
          return false;
        }

        const isValid = inputCode === otpState.code;
        console.log(`[OTP] Verification ${isValid ? 'successful' : 'failed'} - input: ${inputCode}, expected: ${otpState.code}`);

        if (isValid) {
          set({ otpState: null });
        }

        return isValid;
      },

      clearOTP: () => set({ otpState: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);
