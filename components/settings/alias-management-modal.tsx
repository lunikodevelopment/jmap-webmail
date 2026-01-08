"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAliasStore } from '@/stores/alias-store';
import { EmailAlias, AliasForwardingRule } from '@/lib/alias-types';
import { X, Plus, Trash2, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';

interface AliasManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  alias: EmailAlias;
}

export function AliasManagementModal({ isOpen, onClose, alias }: AliasManagementModalProps) {
  const t = useTranslations('settings.alias_management');
  const [activeTab, setActiveTab] = useState<'general' | 'forwarding' | 'stats'>('general');
  const [editingRule, setEditingRule] = useState<AliasForwardingRule | null>(null);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    updateAlias,
    addForwardingRule,
    updateForwardingRule,
    deleteForwardingRule,
    toggleForwardingRule,
    getForwardingRules,
    getAliasStats,
  } = useAliasStore();

  const forwardingRules = getForwardingRules(alias.id);
  const stats = getAliasStats(alias.id);

  const [ruleName, setRuleName] = useState('');
  const [ruleConditions, setRuleConditions] = useState<Array<{ type: string; operator: string; value: string }>>([
    { type: 'from', operator: 'contains', value: '' },
  ]);
  const [ruleAction, setRuleAction] = useState<'forward' | 'copy' | 'redirect' | 'discard'>('forward');
  const [ruleForwardTo, setRuleForwardTo] = useState<string[]>(['']);

  const handleAddRule = () => {
    if (!ruleName.trim()) {
      setError(t('error.rule_name_required'));
      return;
    }

    if (ruleAction !== 'discard' && ruleForwardTo.every(e => !e.trim())) {
      setError(t('error.forward_address_required'));
      return;
    }

    try {
      addForwardingRule(alias.id, {
        name: ruleName,
        enabled: true,
        priority: forwardingRules.length,
        conditions: ruleConditions.map(c => ({
          type: c.type as any,
          operator: c.operator as any,
          value: c.value,
        })),
        conditionMatch: 'all',
        action: ruleAction,
        forwardTo: ruleAction !== 'discard' ? ruleForwardTo.filter(e => e.trim()) : undefined,
      });

      // Reset form
      setRuleName('');
      setRuleConditions([{ type: 'from', operator: 'contains', value: '' }]);
      setRuleAction('forward');
      setRuleForwardTo(['']);
      setShowRuleForm(false);
      setError(null);
    } catch (err) {
      setError(t('error.rule_creation_failed'));
    }
  };

  const handleUpdateRule = () => {
    if (!editingRule) return;

    try {
      updateForwardingRule(alias.id, editingRule.id, {
        name: editingRule.name,
        enabled: editingRule.enabled,
        conditions: editingRule.conditions,
        action: editingRule.action,
        forwardTo: editingRule.forwardTo,
      });

      setEditingRule(null);
      setShowRuleForm(false);
      setError(null);
    } catch (err) {
      setError(t('error.rule_update_failed'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background">
          <div>
            <h2 className="text-lg font-semibold">{alias.email}</h2>
            {alias.displayName && (
              <p className="text-sm text-muted-foreground">{alias.displayName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6">
          {(['general', 'forwarding', 'stats'] as const).map((tab) => (
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

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('general.email')}</label>
                <input
                  type="email"
                  value={alias.email}
                  disabled
                  className="w-full px-3 py-2 border border-input rounded-md bg-muted text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('general.display_name')}</label>
                <input
                  type="text"
                  value={alias.displayName || ''}
                  onChange={(e) => updateAlias(alias.id, { displayName: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('general.description')}</label>
                <textarea
                  value={alias.description || ''}
                  onChange={(e) => updateAlias(alias.id, { description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('general.category')}</label>
                <input
                  type="text"
                  value={alias.category || ''}
                  onChange={(e) => updateAlias(alias.id, { category: e.target.value })}
                  placeholder={t('general.category_placeholder')}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-4 pt-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={alias.canSend}
                    onChange={(e) => updateAlias(alias.id, { canSend: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">{t('general.can_send')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={alias.canReceive}
                    onChange={(e) => updateAlias(alias.id, { canReceive: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">{t('general.can_receive')}</span>
                </label>
              </div>
            </div>
          )}

          {/* Forwarding Tab */}
          {activeTab === 'forwarding' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{t('forwarding.rules_title')}</h3>
                <button
                  onClick={() => {
                    setEditingRule(null);
                    setShowRuleForm(!showRuleForm);
                    setError(null);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  {t('forwarding.add_rule')}
                </button>
              </div>

              {/* Rule Form */}
              {showRuleForm && (
                <div className="p-4 border border-border rounded-md bg-muted/50 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('forwarding.rule_name')}</label>
                    <input
                      type="text"
                      value={editingRule ? editingRule.name : ruleName}
                      onChange={(e) => {
                        if (editingRule) {
                          setEditingRule({ ...editingRule, name: e.target.value });
                        } else {
                          setRuleName(e.target.value);
                        }
                      }}
                      placeholder={t('forwarding.rule_name_placeholder')}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">{t('forwarding.conditions')}</label>
                    <div className="space-y-2">
                      {(editingRule ? editingRule.conditions : ruleConditions).map((condition, idx) => (
                        <div key={idx} className="flex gap-2">
                          <select
                            value={condition.type}
                            onChange={(e) => {
                              if (editingRule) {
                                const newConditions = [...editingRule.conditions];
                                newConditions[idx].type = e.target.value as any;
                                setEditingRule({ ...editingRule, conditions: newConditions });
                              } else {
                                const newConditions = [...ruleConditions];
                                newConditions[idx].type = e.target.value;
                                setRuleConditions(newConditions);
                              }
                            }}
                            className="px-2 py-1 border border-input rounded-md bg-background text-foreground text-sm"
                          >
                            <option value="from">{t('forwarding.condition_from')}</option>
                            <option value="to">{t('forwarding.condition_to')}</option>
                            <option value="subject">{t('forwarding.condition_subject')}</option>
                            <option value="body">{t('forwarding.condition_body')}</option>
                          </select>
                          <select
                            value={condition.operator}
                            onChange={(e) => {
                              if (editingRule) {
                                const newConditions = [...editingRule.conditions];
                                newConditions[idx].operator = e.target.value as any;
                                setEditingRule({ ...editingRule, conditions: newConditions });
                              } else {
                                const newConditions = [...ruleConditions];
                                newConditions[idx].operator = e.target.value;
                                setRuleConditions(newConditions);
                              }
                            }}
                            className="px-2 py-1 border border-input rounded-md bg-background text-foreground text-sm"
                          >
                            <option value="contains">{t('forwarding.operator_contains')}</option>
                            <option value="equals">{t('forwarding.operator_equals')}</option>
                            <option value="startsWith">{t('forwarding.operator_starts')}</option>
                            <option value="endsWith">{t('forwarding.operator_ends')}</option>
                          </select>
                          <input
                            type="text"
                            value={condition.value}
                            onChange={(e) => {
                              if (editingRule) {
                                const newConditions = [...editingRule.conditions];
                                newConditions[idx].value = e.target.value;
                                setEditingRule({ ...editingRule, conditions: newConditions });
                              } else {
                                const newConditions = [...ruleConditions];
                                newConditions[idx].value = e.target.value;
                                setRuleConditions(newConditions);
                              }
                            }}
                            placeholder={t('forwarding.condition_value')}
                            className="flex-1 px-2 py-1 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">{t('forwarding.action')}</label>
                    <select
                      value={editingRule ? editingRule.action : ruleAction}
                      onChange={(e) => {
                        const action = e.target.value as any;
                        if (editingRule) {
                          setEditingRule({ ...editingRule, action });
                        } else {
                          setRuleAction(action);
                        }
                      }}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="forward">{t('forwarding.action_forward')}</option>
                      <option value="copy">{t('forwarding.action_copy')}</option>
                      <option value="redirect">{t('forwarding.action_redirect')}</option>
                      <option value="discard">{t('forwarding.action_discard')}</option>
                    </select>
                  </div>

                  {(editingRule ? editingRule.action : ruleAction) !== 'discard' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">{t('forwarding.forward_to')}</label>
                      <div className="space-y-2">
                        {(editingRule ? editingRule.forwardTo || [] : ruleForwardTo).map((email, idx) => (
                          <input
                            key={idx}
                            type="email"
                            value={email}
                            onChange={(e) => {
                              if (editingRule) {
                                const newForwardTo = [...(editingRule.forwardTo || [])];
                                newForwardTo[idx] = e.target.value;
                                setEditingRule({ ...editingRule, forwardTo: newForwardTo });
                              } else {
                                const newForwardTo = [...ruleForwardTo];
                                newForwardTo[idx] = e.target.value;
                                setRuleForwardTo(newForwardTo);
                              }
                            }}
                            placeholder={t('forwarding.email_placeholder')}
                            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        setShowRuleForm(false);
                        setEditingRule(null);
                        setError(null);
                      }}
                      className="flex-1 px-4 py-2 border border-input rounded-md hover:bg-accent transition-colors text-sm"
                    >
                      {t('forwarding.cancel')}
                    </button>
                    <button
                      onClick={editingRule ? handleUpdateRule : handleAddRule}
                      className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
                    >
                      {editingRule ? t('forwarding.update_rule') : t('forwarding.add_rule')}
                    </button>
                  </div>
                </div>
              )}

              {/* Rules List */}
              {forwardingRules.length > 0 && (
                <div className="space-y-2">
                  {forwardingRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-3 border border-border rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{rule.name}</span>
                          <span className="text-xs text-muted-foreground">({rule.action})</span>
                        </div>
                        {rule.forwardTo && rule.forwardTo.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('forwarding.forwards_to')}: {rule.forwardTo.join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleForwardingRule(alias.id, rule.id)}
                          className="p-1.5 hover:bg-background rounded transition-colors"
                        >
                          {rule.enabled ? (
                            <ToggleRight className="w-4 h-4 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingRule(rule);
                            setShowRuleForm(true);
                          }}
                          className="p-1.5 hover:bg-background rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => deleteForwardingRule(alias.id, rule.id)}
                          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {forwardingRules.length === 0 && !showRuleForm && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('forwarding.no_rules')}
                </p>
              )}
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-4">
              {stats ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted rounded-md">
                      <p className="text-sm text-muted-foreground">{t('stats.emails_sent')}</p>
                      <p className="text-2xl font-semibold mt-1">{stats.emailsSent}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-md">
                      <p className="text-sm text-muted-foreground">{t('stats.emails_received')}</p>
                      <p className="text-2xl font-semibold mt-1">{stats.emailsReceived}</p>
                    </div>
                  </div>
                  {stats.lastUsedAt && (
                    <div className="p-4 bg-muted rounded-md">
                      <p className="text-sm text-muted-foreground">{t('stats.last_used')}</p>
                      <p className="text-sm mt-1">{new Date(stats.lastUsedAt).toLocaleString()}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('stats.no_data')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-input rounded-md hover:bg-accent transition-colors"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
