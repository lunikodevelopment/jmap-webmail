import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AccountCredentials,
  AccountSession,
  AccountProfile,
  AccountSettings,
  AccountSwitchHistory,
} from '@/lib/multi-account-types';

interface MultiAccountState {
  // Accounts
  accounts: AccountCredentials[];
  currentAccountId: string | null;
  
  // Sessions
  sessions: AccountSession[];
  
  // Profiles
  profiles: AccountProfile[];
  
  // Settings
  accountSettings: AccountSettings[];
  
  // History
  switchHistory: AccountSwitchHistory[];
  
  // Actions
  addAccount: (account: AccountCredentials) => void;
  updateAccount: (id: string, updates: Partial<AccountCredentials>) => void;
  deleteAccount: (id: string) => void;
  getAccount: (id: string) => AccountCredentials | undefined;
  getAllAccounts: () => AccountCredentials[];
  getActiveAccounts: () => AccountCredentials[];
  
  // Current Account
  setCurrentAccount: (accountId: string) => void;
  getCurrentAccount: () => AccountCredentials | null;
  
  // Sessions
  createSession: (session: AccountSession) => void;
  updateSession: (id: string, updates: Partial<AccountSession>) => void;
  deleteSession: (id: string) => void;
  getSessionsByAccount: (accountId: string) => AccountSession[];
  
  // Profiles
  setProfile: (profile: AccountProfile) => void;
  getProfile: (accountId: string) => AccountProfile | undefined;
  
  // Settings
  setAccountSettings: (settings: AccountSettings) => void;
  getAccountSettings: (accountId: string) => AccountSettings | undefined;
  
  // Switch History
  recordSwitch: (fromAccountId: string, toAccountId: string) => void;
  getSwitchHistory: (limit?: number) => AccountSwitchHistory[];
  
  // Utilities
  setPrimaryAccount: (accountId: string) => void;
  getPrimaryAccount: () => AccountCredentials | null;
}

export const useMultiAccountStore = create<MultiAccountState>()(
  persist(
    (set, get) => ({
      accounts: [],
      currentAccountId: null,
      sessions: [],
      profiles: [],
      accountSettings: [],
      switchHistory: [],

      // Account Management
      addAccount: (account) =>
        set((state) => ({
          accounts: [...state.accounts, account],
          currentAccountId: state.currentAccountId || account.id,
        })),

      updateAccount: (id, updates) =>
        set((state) => ({
          accounts: state.accounts.map((a) =>
            a.id === id ? { ...a, ...updates, updatedAt: new Date() } : a
          ),
        })),

      deleteAccount: (id) =>
        set((state) => ({
          accounts: state.accounts.filter((a) => a.id !== id),
          currentAccountId: state.currentAccountId === id ? null : state.currentAccountId,
        })),

      getAccount: (id) => {
        const state = get();
        return state.accounts.find((a) => a.id === id);
      },

      getAllAccounts: () => {
        const state = get();
        return state.accounts;
      },

      getActiveAccounts: () => {
        const state = get();
        return state.accounts.filter((a) => a.isActive);
      },

      // Current Account
      setCurrentAccount: (accountId) => {
        const state = get();
        const account = state.accounts.find((a) => a.id === accountId);
        if (account) {
          set({ currentAccountId: accountId });
          if (state.currentAccountId && state.currentAccountId !== accountId) {
            get().recordSwitch(state.currentAccountId, accountId);
          }
        }
      },

      getCurrentAccount: () => {
        const state = get();
        if (!state.currentAccountId) return null;
        return state.accounts.find((a) => a.id === state.currentAccountId) || null;
      },

      // Sessions
      createSession: (session) =>
        set((state) => ({
          sessions: [...state.sessions, session],
        })),

      updateSession: (id, updates) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),

      deleteSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
        })),

      getSessionsByAccount: (accountId) => {
        const state = get();
        return state.sessions.filter((s) => s.accountId === accountId);
      },

      // Profiles
      setProfile: (profile) =>
        set((state) => {
          const existing = state.profiles.find((p) => p.accountId === profile.accountId);
          if (existing) {
            return {
              profiles: state.profiles.map((p) =>
                p.accountId === profile.accountId
                  ? { ...p, ...profile, updatedAt: new Date() }
                  : p
              ),
            };
          }
          return {
            profiles: [...state.profiles, { ...profile, updatedAt: new Date() }],
          };
        }),

      getProfile: (accountId) => {
        const state = get();
        return state.profiles.find((p) => p.accountId === accountId);
      },

      // Settings
      setAccountSettings: (settings) =>
        set((state) => {
          const existing = state.accountSettings.find((s) => s.accountId === settings.accountId);
          if (existing) {
            return {
              accountSettings: state.accountSettings.map((s) =>
                s.accountId === settings.accountId
                  ? { ...s, ...settings, updatedAt: new Date() }
                  : s
              ),
            };
          }
          return {
            accountSettings: [...state.accountSettings, { ...settings, updatedAt: new Date() }],
          };
        }),

      getAccountSettings: (accountId) => {
        const state = get();
        return state.accountSettings.find((s) => s.accountId === accountId);
      },

      // Switch History
      recordSwitch: (fromAccountId, toAccountId) =>
        set((state) => ({
          switchHistory: [
            ...state.switchHistory,
            {
              id: `switch-${Date.now()}`,
              fromAccountId,
              toAccountId,
              switchedAt: new Date(),
            },
          ],
        })),

      getSwitchHistory: (limit = 10) => {
        const state = get();
        return state.switchHistory.slice(-limit).reverse();
      },

      // Utilities
      setPrimaryAccount: (accountId) =>
        set((state) => ({
          accounts: state.accounts.map((a) => ({
            ...a,
            isPrimary: a.id === accountId,
          })),
        })),

      getPrimaryAccount: () => {
        const state = get();
        return state.accounts.find((a) => a.isPrimary) || null;
      },
    }),
    {
      name: 'multi-account-store',
      version: 1,
    }
  )
);
