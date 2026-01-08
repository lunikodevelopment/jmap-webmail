import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  EmailAlias,
  AliasForwardingRule,
  AliasUsageStats,
  AliasPolicy,
  AliasAuditLog,
  AliasAdminStats,
  CreateAliasRequest,
  UpdateAliasRequest,
  AliasBatchOperation,
  generateAliasId,
  AliasStatus,
  AliasVisibility,
} from '@/lib/alias-types';

interface AliasStore {
  // State
  aliases: EmailAlias[];
  policies: AliasPolicy[];
  auditLogs: AliasAuditLog[];
  selectedAliasId: string | null;
  adminStats: AliasAdminStats | null;
  isLoading: boolean;
  error: string | null;

  // Alias CRUD operations
  createAlias: (request: CreateAliasRequest) => EmailAlias;
  updateAlias: (aliasId: string, updates: UpdateAliasRequest) => void;
  deleteAlias: (aliasId: string) => void;
  getAliasById: (aliasId: string) => EmailAlias | undefined;
  getAliasByEmail: (email: string) => EmailAlias | undefined;
  getActiveAliases: () => EmailAlias[];
  getAliasesByCategory: (category: string) => EmailAlias[];
  getAliasesByTag: (tag: string) => EmailAlias[];

  // Alias status operations
  activateAlias: (aliasId: string) => void;
  deactivateAlias: (aliasId: string) => void;
  archiveAlias: (aliasId: string) => void;
  setDefaultAlias: (aliasId: string) => void;

  // Forwarding rules
  addForwardingRule: (aliasId: string, rule: Omit<AliasForwardingRule, 'id' | 'aliasId' | 'createdAt' | 'updatedAt'>) => void;
  updateForwardingRule: (aliasId: string, ruleId: string, updates: Partial<AliasForwardingRule>) => void;
  deleteForwardingRule: (aliasId: string, ruleId: string) => void;
  getForwardingRules: (aliasId: string) => AliasForwardingRule[];
  toggleForwardingRule: (aliasId: string, ruleId: string) => void;

  // Usage statistics
  updateAliasStats: (aliasId: string, stats: Partial<AliasUsageStats>) => void;
  recordEmailSent: (aliasId: string) => void;
  recordEmailReceived: (aliasId: string) => void;
  getAliasStats: (aliasId: string) => AliasUsageStats | undefined;

  // Visibility and masking
  setAliasVisibility: (aliasId: string, visibility: AliasVisibility) => void;
  setMaskPrimaryEmail: (aliasId: string, mask: boolean) => void;

  // Batch operations
  batchUpdateAliases: (operation: AliasBatchOperation) => void;

  // Policy management
  createPolicy: (policy: Omit<AliasPolicy, 'id' | 'createdAt' | 'updatedAt'>) => AliasPolicy;
  updatePolicy: (policyId: string, updates: Partial<AliasPolicy>) => void;
  deletePolicy: (policyId: string) => void;
  getPolicyById: (policyId: string) => AliasPolicy | undefined;
  getActivePolicies: () => AliasPolicy[];

  // Audit logging
  addAuditLog: (log: Omit<AliasAuditLog, 'id' | 'timestamp'>) => void;
  getAuditLogs: (aliasId?: string, limit?: number) => AliasAuditLog[];
  clearAuditLogs: (olderThanDays?: number) => void;

  // Admin statistics
  updateAdminStats: (stats: Partial<AliasAdminStats>) => void;
  getAdminStats: () => AliasAdminStats | null;

  // Selection and UI
  selectAlias: (aliasId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Bulk operations
  importAliases: (aliases: EmailAlias[]) => void;
  exportAliases: () => string;
}

const generateRuleId = () => `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generatePolicyId = () => `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateAuditLogId = () => `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useAliasStore = create<AliasStore>()(
  persist(
    (set, get) => ({
      aliases: [],
      policies: [],
      auditLogs: [],
      selectedAliasId: null,
      adminStats: null,
      isLoading: false,
      error: null,

      // Alias CRUD operations
      createAlias: (request: CreateAliasRequest) => {
        const newAlias: EmailAlias = {
          id: generateAliasId(),
          accountId: '', // Will be set by the application
          email: request.email,
          displayName: request.displayName,
          description: request.description,
          status: 'active',
          visibility: request.visibility || 'alias',
          forwardingRules: [],
          canSend: request.canSend !== false,
          canReceive: request.canReceive !== false,
          category: request.category,
          tags: request.tags || [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          aliases: [...state.aliases, newAlias],
        }));

        // Log the creation
        get().addAuditLog({
          userId: '', // Will be set by the application
          action: 'create',
          aliasId: newAlias.id,
          aliasEmail: newAlias.email,
        });

        return newAlias;
      },

      updateAlias: (aliasId: string, updates: UpdateAliasRequest) => {
        set((state) => ({
          aliases: state.aliases.map((alias) =>
            alias.id === aliasId
              ? { ...alias, ...updates, updatedAt: Date.now() }
              : alias
          ),
        }));

        get().addAuditLog({
          userId: '',
          action: 'update',
          aliasId,
          aliasEmail: get().getAliasById(aliasId)?.email || '',
          changes: updates as Record<string, { before: unknown; after: unknown }>,
        });
      },

      deleteAlias: (aliasId: string) => {
        const alias = get().getAliasById(aliasId);
        if (!alias) return;

        set((state) => ({
          aliases: state.aliases.filter((a) => a.id !== aliasId),
          selectedAliasId: state.selectedAliasId === aliasId ? null : state.selectedAliasId,
        }));

        get().addAuditLog({
          userId: '',
          action: 'delete',
          aliasId,
          aliasEmail: alias.email,
        });
      },

      getAliasById: (aliasId: string) => {
        return get().aliases.find((a) => a.id === aliasId);
      },

      getAliasByEmail: (email: string) => {
        return get().aliases.find((a) => a.email.toLowerCase() === email.toLowerCase());
      },

      getActiveAliases: () => {
        return get().aliases.filter((a) => a.status === 'active');
      },

      getAliasesByCategory: (category: string) => {
        return get().aliases.filter((a) => a.category === category);
      },

      getAliasesByTag: (tag: string) => {
        return get().aliases.filter((a) => a.tags?.includes(tag));
      },

      // Alias status operations
      activateAlias: (aliasId: string) => {
        get().updateAlias(aliasId, { status: 'active' });
        get().addAuditLog({
          userId: '',
          action: 'activate',
          aliasId,
          aliasEmail: get().getAliasById(aliasId)?.email || '',
        });
      },

      deactivateAlias: (aliasId: string) => {
        get().updateAlias(aliasId, { status: 'inactive' });
        get().addAuditLog({
          userId: '',
          action: 'deactivate',
          aliasId,
          aliasEmail: get().getAliasById(aliasId)?.email || '',
        });
      },

      archiveAlias: (aliasId: string) => {
        get().updateAlias(aliasId, { status: 'archived' });
        get().addAuditLog({
          userId: '',
          action: 'archive',
          aliasId,
          aliasEmail: get().getAliasById(aliasId)?.email || '',
        });
      },

      setDefaultAlias: (aliasId: string) => {
        set((state) => ({
          aliases: state.aliases.map((alias) => ({
            ...alias,
            isDefault: alias.id === aliasId,
          })),
        }));
      },

      // Forwarding rules
      addForwardingRule: (aliasId: string, rule) => {
        const newRule: AliasForwardingRule = {
          ...rule,
          id: generateRuleId(),
          aliasId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          aliases: state.aliases.map((alias) =>
            alias.id === aliasId
              ? { ...alias, forwardingRules: [...alias.forwardingRules, newRule] }
              : alias
          ),
        }));
      },

      updateForwardingRule: (aliasId: string, ruleId: string, updates: Partial<AliasForwardingRule>) => {
        set((state) => ({
          aliases: state.aliases.map((alias) =>
            alias.id === aliasId
              ? {
                  ...alias,
                  forwardingRules: alias.forwardingRules.map((rule) =>
                    rule.id === ruleId
                      ? { ...rule, ...updates, updatedAt: Date.now() }
                      : rule
                  ),
                }
              : alias
          ),
        }));
      },

      deleteForwardingRule: (aliasId: string, ruleId: string) => {
        set((state) => ({
          aliases: state.aliases.map((alias) =>
            alias.id === aliasId
              ? {
                  ...alias,
                  forwardingRules: alias.forwardingRules.filter((r) => r.id !== ruleId),
                }
              : alias
          ),
        }));
      },

      getForwardingRules: (aliasId: string) => {
        const alias = get().getAliasById(aliasId);
        return alias?.forwardingRules || [];
      },

      toggleForwardingRule: (aliasId: string, ruleId: string) => {
        const rule = get().getForwardingRules(aliasId).find((r) => r.id === ruleId);
        if (rule) {
          get().updateForwardingRule(aliasId, ruleId, { enabled: !rule.enabled });
        }
      },

      // Usage statistics
      updateAliasStats: (aliasId: string, stats: Partial<AliasUsageStats>) => {
        set((state) => ({
          aliases: state.aliases.map((alias) =>
            alias.id === aliasId
              ? {
                  ...alias,
                  stats: {
                    aliasId,
                    emailsSent: stats.emailsSent ?? alias.stats?.emailsSent ?? 0,
                    emailsReceived: stats.emailsReceived ?? alias.stats?.emailsReceived ?? 0,
                    lastUsedAt: stats.lastUsedAt ?? alias.stats?.lastUsedAt,
                    createdAt: alias.stats?.createdAt ?? Date.now(),
                    updatedAt: Date.now(),
                  },
                }
              : alias
          ),
        }));
      },

      recordEmailSent: (aliasId: string) => {
        const alias = get().getAliasById(aliasId);
        if (alias) {
          get().updateAliasStats(aliasId, {
            emailsSent: (alias.stats?.emailsSent ?? 0) + 1,
            lastUsedAt: new Date().toISOString(),
          });
        }
      },

      recordEmailReceived: (aliasId: string) => {
        const alias = get().getAliasById(aliasId);
        if (alias) {
          get().updateAliasStats(aliasId, {
            emailsReceived: (alias.stats?.emailsReceived ?? 0) + 1,
            lastUsedAt: new Date().toISOString(),
          });
        }
      },

      getAliasStats: (aliasId: string) => {
        return get().getAliasById(aliasId)?.stats;
      },

      // Visibility and masking
      setAliasVisibility: (aliasId: string, visibility: AliasVisibility) => {
        get().updateAlias(aliasId, { visibility });
      },

      setMaskPrimaryEmail: (aliasId: string, mask: boolean) => {
        get().updateAlias(aliasId, { maskPrimaryEmail: mask });
      },

      // Batch operations
      batchUpdateAliases: (operation: AliasBatchOperation) => {
        const { aliasIds, operation: op, reason } = operation;

        set((state) => ({
          aliases: state.aliases.map((alias) =>
            aliasIds.includes(alias.id)
              ? {
                  ...alias,
                  status: op === 'delete' ? 'archived' : (op as AliasStatus),
                  updatedAt: Date.now(),
                }
              : alias
          ),
        }));

        // Log each operation
        aliasIds.forEach((aliasId) => {
          const alias = get().getAliasById(aliasId);
          if (alias) {
            get().addAuditLog({
              userId: '',
              action: op as any,
              aliasId,
              aliasEmail: alias.email,
              reason,
            });
          }
        });
      },

      // Policy management
      createPolicy: (policy) => {
        const newPolicy: AliasPolicy = {
          ...policy,
          id: generatePolicyId(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          policies: [...state.policies, newPolicy],
        }));

        return newPolicy;
      },

      updatePolicy: (policyId: string, updates: Partial<AliasPolicy>) => {
        set((state) => ({
          policies: state.policies.map((policy) =>
            policy.id === policyId
              ? { ...policy, ...updates, updatedAt: Date.now() }
              : policy
          ),
        }));
      },

      deletePolicy: (policyId: string) => {
        set((state) => ({
          policies: state.policies.filter((p) => p.id !== policyId),
        }));
      },

      getPolicyById: (policyId: string) => {
        return get().policies.find((p) => p.id === policyId);
      },

      getActivePolicies: () => {
        return get().policies.filter((p) => p.enabled);
      },

      // Audit logging
      addAuditLog: (log) => {
        const newLog: AliasAuditLog = {
          ...log,
          id: generateAuditLogId(),
          timestamp: Date.now(),
        };

        set((state) => ({
          auditLogs: [newLog, ...state.auditLogs].slice(0, 10000), // Keep last 10k logs
        }));
      },

      getAuditLogs: (aliasId?: string, limit = 100) => {
        let logs = get().auditLogs;
        if (aliasId) {
          logs = logs.filter((log) => log.aliasId === aliasId);
        }
        return logs.slice(0, limit);
      },

      clearAuditLogs: (olderThanDays = 90) => {
        const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
        set((state) => ({
          auditLogs: state.auditLogs.filter((log) => log.timestamp > cutoffTime),
        }));
      },

      // Admin statistics
      updateAdminStats: (stats: Partial<AliasAdminStats>) => {
        set((state) => ({
          adminStats: state.adminStats
            ? { ...state.adminStats, ...stats, lastUpdated: Date.now() }
            : {
                totalAliases: 0,
                activeAliases: 0,
                inactiveAliases: 0,
                archivedAliases: 0,
                totalUsers: 0,
                usersWithAliases: 0,
                averageAliasesPerUser: 0,
                totalForwardingRules: 0,
                policyViolations: 0,
                lastUpdated: Date.now(),
                ...stats,
              },
        }));
      },

      getAdminStats: () => {
        return get().adminStats;
      },

      // Selection and UI
      selectAlias: (aliasId: string | null) => {
        set({ selectedAliasId: aliasId });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      // Bulk operations
      importAliases: (aliases: EmailAlias[]) => {
        set((state) => ({
          aliases: [...state.aliases, ...aliases],
        }));
      },

      exportAliases: () => {
        const aliases = get().aliases;
        return JSON.stringify(aliases, null, 2);
      },
    }),
    {
      name: 'alias-store',
      version: 1,
    }
  )
);
