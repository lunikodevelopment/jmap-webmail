"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAliasStore } from '@/stores/alias-store';
import { AliasPolicy } from '@/lib/alias-types';
import { Plus, Trash2, Edit2, ToggleLeft, ToggleRight, Download, Upload } from 'lucide-react';

export function AliasAdminTools() {
  const t = useTranslations('settings.alias_admin');
  const [activeTab, setActiveTab] = useState<'policies' | 'audit' | 'stats'>('policies');
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<AliasPolicy | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    aliases,
    policies,
    auditLogs,
    adminStats,
    createPolicy,
    updatePolicy,
    deletePolicy,
    getAuditLogs,
    updateAdminStats,
    exportAliases,
  } = useAliasStore();

  // Policy form state
  const [policyName, setPolicyName] = useState('');
  const [policyDescription, setPolicyDescription] = useState('');
  const [policyEnabled, setPolicyEnabled] = useState(true);
  const [maxAliasesPerUser, setMaxAliasesPerUser] = useState<number | undefined>();
  const [allowedDomains, setAllowedDomains] = useState('');
  const [namingPattern, setNamingPattern] = useState('');
  const [allowExternalForwarding, setAllowExternalForwarding] = useState(true);

  const handleCreatePolicy = () => {
    if (!policyName.trim()) {
      setError(t('error.policy_name_required'));
      return;
    }

    try {
      createPolicy({
        name: policyName,
        description: policyDescription || undefined,
        enabled: policyEnabled,
        maxAliasesPerUser,
        allowedDomains: allowedDomains ? allowedDomains.split(',').map(d => d.trim()) : undefined,
        namingPattern: namingPattern || undefined,
        allowExternalForwarding,
      });

      // Reset form
      setPolicyName('');
      setPolicyDescription('');
      setPolicyEnabled(true);
      setMaxAliasesPerUser(undefined);
      setAllowedDomains('');
      setNamingPattern('');
      setAllowExternalForwarding(true);
      setShowPolicyForm(false);
      setError(null);
    } catch (err) {
      setError(t('error.policy_creation_failed'));
    }
  };

  const handleUpdatePolicy = () => {
    if (!editingPolicy) return;

    try {
      updatePolicy(editingPolicy.id, {
        name: editingPolicy.name,
        description: editingPolicy.description,
        enabled: editingPolicy.enabled,
        maxAliasesPerUser: editingPolicy.maxAliasesPerUser,
        allowedDomains: editingPolicy.allowedDomains,
        namingPattern: editingPolicy.namingPattern,
        allowExternalForwarding: editingPolicy.allowExternalForwarding,
      });

      setEditingPolicy(null);
      setShowPolicyForm(false);
      setError(null);
    } catch (err) {
      setError(t('error.policy_update_failed'));
    }
  };

  const handleExportAliases = () => {
    const data = exportAliases();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aliases-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportAliases = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (Array.isArray(data)) {
          // Import aliases
          console.log('Importing aliases:', data);
          setError(null);
        } else {
          setError(t('error.invalid_import_format'));
        }
      } catch (err) {
        setError(t('error.import_failed'));
      }
    };
    reader.readAsText(file);
  };

  const recentLogs = getAuditLogs(undefined, 50);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-border">
        {(['policies', 'audit', 'stats'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Policies Tab */}
      {activeTab === 'policies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{t('policies.title')}</h3>
            <button
              onClick={() => {
                setEditingPolicy(null);
                setShowPolicyForm(!showPolicyForm);
                setError(null);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              {t('policies.add_policy')}
            </button>
          </div>

          {/* Policy Form */}
          {showPolicyForm && (
            <div className="p-4 border border-border rounded-md bg-muted/50 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('policies.name')}</label>
                <input
                  type="text"
                  value={editingPolicy ? editingPolicy.name : policyName}
                  onChange={(e) => {
                    if (editingPolicy) {
                      setEditingPolicy({ ...editingPolicy, name: e.target.value });
                    } else {
                      setPolicyName(e.target.value);
                    }
                  }}
                  placeholder={t('policies.name_placeholder')}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('policies.description')}</label>
                <textarea
                  value={editingPolicy ? editingPolicy.description || '' : policyDescription}
                  onChange={(e) => {
                    if (editingPolicy) {
                      setEditingPolicy({ ...editingPolicy, description: e.target.value });
                    } else {
                      setPolicyDescription(e.target.value);
                    }
                  }}
                  rows={2}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('policies.max_aliases')}</label>
                  <input
                    type="number"
                    value={editingPolicy ? editingPolicy.maxAliasesPerUser || '' : maxAliasesPerUser || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : undefined;
                      if (editingPolicy) {
                        setEditingPolicy({ ...editingPolicy, maxAliasesPerUser: value });
                      } else {
                        setMaxAliasesPerUser(value);
                      }
                    }}
                    placeholder={t('policies.unlimited')}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">{t('policies.naming_pattern')}</label>
                  <input
                    type="text"
                    value={editingPolicy ? editingPolicy.namingPattern || '' : namingPattern}
                    onChange={(e) => {
                      if (editingPolicy) {
                        setEditingPolicy({ ...editingPolicy, namingPattern: e.target.value });
                      } else {
                        setNamingPattern(e.target.value);
                      }
                    }}
                    placeholder={t('policies.pattern_placeholder')}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('policies.allowed_domains')}</label>
                <textarea
                  value={editingPolicy ? (editingPolicy.allowedDomains || []).join(', ') : allowedDomains}
                  onChange={(e) => {
                    if (editingPolicy) {
                      setEditingPolicy({
                        ...editingPolicy,
                        allowedDomains: e.target.value ? e.target.value.split(',').map(d => d.trim()) : undefined,
                      });
                    } else {
                      setAllowedDomains(e.target.value);
                    }
                  }}
                  placeholder={t('policies.domains_placeholder')}
                  rows={2}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingPolicy ? editingPolicy.allowExternalForwarding : allowExternalForwarding}
                  onChange={(e) => {
                    if (editingPolicy) {
                      setEditingPolicy({ ...editingPolicy, allowExternalForwarding: e.target.checked });
                    } else {
                      setAllowExternalForwarding(e.target.checked);
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm">{t('policies.allow_external_forwarding')}</span>
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowPolicyForm(false);
                    setEditingPolicy(null);
                    setError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-input rounded-md hover:bg-accent transition-colors text-sm"
                >
                  {t('policies.cancel')}
                </button>
                <button
                  onClick={editingPolicy ? handleUpdatePolicy : handleCreatePolicy}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
                >
                  {editingPolicy ? t('policies.update') : t('policies.create')}
                </button>
              </div>
            </div>
          )}

          {/* Policies List */}
          {policies.length > 0 && (
            <div className="space-y-2">
              {policies.map((policy) => (
                <div
                  key={policy.id}
                  className="flex items-center justify-between p-3 border border-border rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{policy.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          policy.enabled
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {policy.enabled ? t('policies.enabled') : t('policies.disabled')}
                      </span>
                    </div>
                    {policy.description && (
                      <p className="text-xs text-muted-foreground mt-1">{policy.description}</p>
                    )}
                    {policy.maxAliasesPerUser && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('policies.max_aliases')}: {policy.maxAliasesPerUser}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => {
                        setEditingPolicy(policy);
                        setShowPolicyForm(true);
                      }}
                      className="p-1.5 hover:bg-background rounded transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => deletePolicy(policy.id)}
                      className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {policies.length === 0 && !showPolicyForm && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('policies.no_policies')}
            </p>
          )}
        </div>
      )}

      {/* Audit Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{t('audit.title')}</h3>
            <div className="flex gap-2">
              <button
                onClick={handleExportAliases}
                className="flex items-center gap-2 px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-md transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                {t('audit.export')}
              </button>
              <label className="flex items-center gap-2 px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-md transition-colors text-sm cursor-pointer">
                <Upload className="w-4 h-4" />
                {t('audit.import')}
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportAliases}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Audit Logs */}
          {recentLogs.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 border border-border rounded-md text-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{log.aliasEmail}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {log.action}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {log.reason && (
                    <p className="text-xs text-muted-foreground mt-1">{log.reason}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {recentLogs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('audit.no_logs')}
            </p>
          )}
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          {adminStats ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">{t('stats.total_aliases')}</p>
                <p className="text-2xl font-semibold mt-1">{adminStats.totalAliases}</p>
              </div>
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">{t('stats.active_aliases')}</p>
                <p className="text-2xl font-semibold mt-1 text-green-600">{adminStats.activeAliases}</p>
              </div>
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">{t('stats.inactive_aliases')}</p>
                <p className="text-2xl font-semibold mt-1 text-gray-600">{adminStats.inactiveAliases}</p>
              </div>
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">{t('stats.total_users')}</p>
                <p className="text-2xl font-semibold mt-1">{adminStats.totalUsers}</p>
              </div>
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">{t('stats.users_with_aliases')}</p>
                <p className="text-2xl font-semibold mt-1">{adminStats.usersWithAliases}</p>
              </div>
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">{t('stats.avg_per_user')}</p>
                <p className="text-2xl font-semibold mt-1">{adminStats.averageAliasesPerUser.toFixed(1)}</p>
              </div>
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">{t('stats.forwarding_rules')}</p>
                <p className="text-2xl font-semibold mt-1">{adminStats.totalForwardingRules}</p>
              </div>
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">{t('stats.policy_violations')}</p>
                <p className="text-2xl font-semibold mt-1 text-red-600">{adminStats.policyViolations}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('stats.no_data')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
