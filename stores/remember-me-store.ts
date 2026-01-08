import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RememberMeToken, RememberMeSettings, RememberMeDevice } from '@/lib/remember-me-types';

interface RememberMeState {
  // Tokens
  tokens: RememberMeToken[];
  
  // Devices
  devices: RememberMeDevice[];
  
  // Settings
  settings: RememberMeSettings;
  
  // Current state
  isRemembered: boolean;
  currentDeviceId: string | null;
  
  // Token Actions
  createToken: (token: RememberMeToken) => void;
  getToken: (tokenId: string) => RememberMeToken | undefined;
  getTokensByEmail: (email: string) => RememberMeToken[];
  validateToken: (email: string, token: string) => boolean;
  revokeToken: (tokenId: string) => void;
  revokeAllTokens: (email: string) => void;
  updateTokenLastUsed: (tokenId: string) => void;
  
  // Device Actions
  registerDevice: (device: RememberMeDevice) => void;
  getDevice: (deviceId: string) => RememberMeDevice | undefined;
  getDevicesByEmail: (email: string) => RememberMeDevice[];
  updateDevice: (deviceId: string, updates: Partial<RememberMeDevice>) => void;
  removeDevice: (deviceId: string) => void;
  removeAllDevices: (email: string) => void;
  
  // Settings
  updateSettings: (settings: Partial<RememberMeSettings>) => void;
  getSettings: () => RememberMeSettings;
  
  // State
  setIsRemembered: (isRemembered: boolean) => void;
  setCurrentDeviceId: (deviceId: string | null) => void;
  
  // Cleanup
  cleanupExpiredTokens: () => void;
}

const DEFAULT_SETTINGS: RememberMeSettings = {
  enabled: true,
  maxTokens: 5,
  tokenExpirationDays: 30,
  requireConfirmation: false,
  notifyOnNewDevice: true,
};

export const useRememberMeStore = create<RememberMeState>()(
  persist(
    (set, get) => ({
      tokens: [],
      devices: [],
      settings: DEFAULT_SETTINGS,
      isRemembered: false,
      currentDeviceId: null,

      // Token Actions
      createToken: (token) =>
        set((state) => ({
          tokens: [...state.tokens, token],
        })),

      getToken: (tokenId) => {
        const state = get();
        return state.tokens.find((t) => t.id === tokenId);
      },

      getTokensByEmail: (email) => {
        const state = get();
        return state.tokens.filter((t) => t.email === email && t.isActive);
      },

      validateToken: (email, token) => {
        const state = get();
        const rememberToken = state.tokens.find(
          (t) => t.email === email && t.token === token && t.isActive
        );
        
        if (!rememberToken) return false;
        
        // Check if token is expired
        if (new Date() > rememberToken.expiresAt) {
          get().revokeToken(rememberToken.id);
          return false;
        }
        
        return true;
      },

      revokeToken: (tokenId) =>
        set((state) => ({
          tokens: state.tokens.map((t) =>
            t.id === tokenId ? { ...t, isActive: false } : t
          ),
        })),

      revokeAllTokens: (email) =>
        set((state) => ({
          tokens: state.tokens.map((t) =>
            t.email === email ? { ...t, isActive: false } : t
          ),
        })),

      updateTokenLastUsed: (tokenId) =>
        set((state) => ({
          tokens: state.tokens.map((t) =>
            t.id === tokenId ? { ...t, lastUsedAt: new Date() } : t
          ),
        })),

      // Device Actions
      registerDevice: (device) =>
        set((state) => ({
          devices: [...state.devices, device],
        })),

      getDevice: (deviceId) => {
        const state = get();
        return state.devices.find((d) => d.id === deviceId);
      },

      getDevicesByEmail: (email) => {
        const state = get();
        return state.devices.filter((d) => d.email === email);
      },

      updateDevice: (deviceId, updates) =>
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === deviceId ? { ...d, ...updates } : d
          ),
        })),

      removeDevice: (deviceId) =>
        set((state) => ({
          devices: state.devices.filter((d) => d.id !== deviceId),
        })),

      removeAllDevices: (email) =>
        set((state) => ({
          devices: state.devices.filter((d) => d.email !== email),
        })),

      // Settings
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      getSettings: () => {
        const state = get();
        return state.settings;
      },

      // State
      setIsRemembered: (isRemembered) => set({ isRemembered }),

      setCurrentDeviceId: (deviceId) => set({ currentDeviceId: deviceId }),

      // Cleanup
      cleanupExpiredTokens: () =>
        set((state) => {
          const now = new Date();
          return {
            tokens: state.tokens.filter((t) => t.expiresAt > now),
          };
        }),
    }),
    {
      name: 'remember-me-store',
      version: 1,
    }
  )
);
