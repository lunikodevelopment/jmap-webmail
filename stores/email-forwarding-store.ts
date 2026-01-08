import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ExternalForwarding,
  AccountForwarding,
  ConditionalForwardingRule,
  ForwardingStatistics,
} from '@/lib/email-forwarding-types';

interface EmailForwardingState {
  // Forwarding rules
  externalForwardings: ExternalForwarding[];
  accountForwardings: AccountForwarding[];
  conditionalRules: ConditionalForwardingRule[];
  
  // Statistics
  statistics: ForwardingStatistics[];
  
  // UI state
  selectedForwardingId: string | null;
  
  // External Forwarding Actions
  addExternalForwarding: (forwarding: ExternalForwarding) => void;
  updateExternalForwarding: (id: string, updates: Partial<ExternalForwarding>) => void;
  deleteExternalForwarding: (id: string) => void;
  getExternalForwarding: (id: string) => ExternalForwarding | undefined;
  getExternalForwardingsBySource: (sourceEmail: string) => ExternalForwarding[];
  
  // Account Forwarding Actions
  addAccountForwarding: (forwarding: AccountForwarding) => void;
  updateAccountForwarding: (id: string, updates: Partial<AccountForwarding>) => void;
  deleteAccountForwarding: (id: string) => void;
  getAccountForwarding: (id: string) => AccountForwarding | undefined;
  getAccountForwardingsBySource: (sourceEmail: string) => AccountForwarding[];
  
  // Conditional Rules Actions
  addConditionalRule: (rule: ConditionalForwardingRule) => void;
  updateConditionalRule: (id: string, updates: Partial<ConditionalForwardingRule>) => void;
  deleteConditionalRule: (id: string) => void;
  getConditionalRule: (id: string) => ConditionalForwardingRule | undefined;
  getConditionalRulesBySource: (sourceEmail: string) => ConditionalForwardingRule[];
  
  // Statistics
  recordForwardingSuccess: (forwardingId: string) => void;
  recordForwardingFailure: (forwardingId: string, reason: string) => void;
  getStatistics: (forwardingId: string) => ForwardingStatistics | undefined;
  
  // UI
  setSelectedForwardingId: (id: string | null) => void;
}

export const useEmailForwardingStore = create<EmailForwardingState>()(
  persist(
    (set, get) => ({
      externalForwardings: [],
      accountForwardings: [],
      conditionalRules: [],
      statistics: [],
      selectedForwardingId: null,

      // External Forwarding
      addExternalForwarding: (forwarding) =>
        set((state) => ({
          externalForwardings: [...state.externalForwardings, forwarding],
        })),

      updateExternalForwarding: (id, updates) =>
        set((state) => ({
          externalForwardings: state.externalForwardings.map((f) =>
            f.id === id ? { ...f, ...updates, updatedAt: new Date() } : f
          ),
        })),

      deleteExternalForwarding: (id) =>
        set((state) => ({
          externalForwardings: state.externalForwardings.filter((f) => f.id !== id),
        })),

      getExternalForwarding: (id) => {
        const state = get();
        return state.externalForwardings.find((f) => f.id === id);
      },

      getExternalForwardingsBySource: (sourceEmail) => {
        const state = get();
        return state.externalForwardings.filter((f) => f.sourceEmail === sourceEmail);
      },

      // Account Forwarding
      addAccountForwarding: (forwarding) =>
        set((state) => ({
          accountForwardings: [...state.accountForwardings, forwarding],
        })),

      updateAccountForwarding: (id, updates) =>
        set((state) => ({
          accountForwardings: state.accountForwardings.map((f) =>
            f.id === id ? { ...f, ...updates, updatedAt: new Date() } : f
          ),
        })),

      deleteAccountForwarding: (id) =>
        set((state) => ({
          accountForwardings: state.accountForwardings.filter((f) => f.id !== id),
        })),

      getAccountForwarding: (id) => {
        const state = get();
        return state.accountForwardings.find((f) => f.id === id);
      },

      getAccountForwardingsBySource: (sourceEmail) => {
        const state = get();
        return state.accountForwardings.filter((f) => f.sourceEmail === sourceEmail);
      },

      // Conditional Rules
      addConditionalRule: (rule) =>
        set((state) => ({
          conditionalRules: [...state.conditionalRules, rule],
        })),

      updateConditionalRule: (id, updates) =>
        set((state) => ({
          conditionalRules: state.conditionalRules.map((r) =>
            r.id === id ? { ...r, ...updates, updatedAt: new Date() } : r
          ),
        })),

      deleteConditionalRule: (id) =>
        set((state) => ({
          conditionalRules: state.conditionalRules.filter((r) => r.id !== id),
        })),

      getConditionalRule: (id) => {
        const state = get();
        return state.conditionalRules.find((r) => r.id === id);
      },

      getConditionalRulesBySource: (sourceEmail) => {
        const state = get();
        return state.conditionalRules.filter((r) => r.sourceEmail === sourceEmail);
      },

      // Statistics
      recordForwardingSuccess: (forwardingId) =>
        set((state) => {
          const existing = state.statistics.find((s) => s.forwardingId === forwardingId);
          if (existing) {
            return {
              statistics: state.statistics.map((s) =>
                s.forwardingId === forwardingId
                  ? {
                      ...s,
                      emailsForwarded: s.emailsForwarded + 1,
                      lastForwardedAt: new Date(),
                    }
                  : s
              ),
            };
          }
          return state;
        }),

      recordForwardingFailure: (forwardingId, reason) =>
        set((state) => {
          const existing = state.statistics.find((s) => s.forwardingId === forwardingId);
          if (existing) {
            return {
              statistics: state.statistics.map((s) =>
                s.forwardingId === forwardingId
                  ? {
                      ...s,
                      failureCount: s.failureCount + 1,
                      lastFailureAt: new Date(),
                      lastFailureReason: reason,
                    }
                  : s
              ),
            };
          }
          return state;
        }),

      getStatistics: (forwardingId) => {
        const state = get();
        return state.statistics.find((s) => s.forwardingId === forwardingId);
      },

      setSelectedForwardingId: (id) => set({ selectedForwardingId: id }),
    }),
    {
      name: 'email-forwarding-store',
      version: 1,
    }
  )
);
