"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAliasStore } from '@/stores/alias-store';
import { SettingsSection, SettingItem } from './settings-section';
import { ChevronRight, Plus, Trash2, Edit2, Copy, Eye, EyeOff } from 'lucide-react';
import { EmailAlias, AliasVisibility } from '@/lib/alias-types';

export function EmailAliasesSettings() {
  const t = useTranslations('settings.email_aliases');
  const [showAliasModal, setShowAliasModal] = useState(false);
  const [editingAlias, setEditingAlias] = useState<EmailAlias | null>(null);
  const [newAliasEmail, setNewAliasEmail] = useState('');
  const [newAliasName, setNewAliasName] = useState('');
  const [newAliasCategory, setNewAliasCategory] = useState('');
  const [newAliasVisibility, setNewAliasVisibility] = useState<AliasVisibility>('alias');
  const [error, setError] = useState<string | null>(null);

  const {
    aliases,
    createAlias,
    updateAlias,
    deleteAlias,
    activateAlias,
    deactivateAlias,
    setAliasVisibility,
  } = useAliasStore();

  const activeAliases = aliases.filter(a => a.status === 'active');
  const inactiveAliases = aliases.filter(a => a.status === 'inactive');

  const handleCreateAlias = () => {
    if (!newAliasEmail.trim()) {
      setError(t('error.email_required'));
      return;
    }

    if (!newAliasEmail.includes('@')) {
      setError(t('error.invalid_email'));
      return;
    }

    // Check for duplicates
    if (aliases.some(a => a.email.toLowerCase() === newAliasEmail.toLowerCase())) {
      setError(t('error.alias_exists'));
      return;
    }

    try {
      createAlias({
        email: newAliasEmail,
        displayName: newAliasName || undefined,
        category: newAliasCategory || undefined,
        visibility: newAliasVisibility,
      });

      setNewAliasEmail('');
      setNewAliasName('');
      setNewAliasCategory('');
      setNewAliasVisibility('alias');
      setError(null);
      setShowAliasModal(false);
    } catch (err) {
      setError(t('error.creation_failed'));
    }
  };

  const handleUpdateAlias = () => {
    if (!editingAlias) return;

    try {
      updateAlias(editingAlias.id, {
        displayName: editingAlias.displayName,
        description: editingAlias.description,
        category: editingAlias.category,
        visibility: editingAlias.visibility,
      });

      setEditingAlias(null);
      setError(null);
    } catch (err) {
      setError(t('error.update_failed'));
    }
  };

  const handleDeleteAlias = (aliasId: string) => {
    if (confirm(t('confirm.delete_alias'))) {
      try {
        deleteAlias(aliasId);
      } catch (err) {
        setError(t('error.delete_failed'));
      }
    }
  };

  const handleToggleAlias = (alias: EmailAlias) => {
    if (alias.status === 'active') {
      deactivateAlias(alias.id);
    } else {
      activateAlias(alias.id);
    }
  };

  const handleChangeVisibility = (aliasId: string, visibility: AliasVisibility) => {
    setAliasVisibility(aliasId, visibility);
  };

  const getVisibilityLabel = (visibility: AliasVisibility) => {
    const labels: Record<AliasVisibility, string> = {
      'primary': t('visibility.primary'),
      'alias': t('visibility.alias'),
      'masked': t('visibility.masked'),
    };
    return labels[visibility] || visibility;
  };

  return (
    <SettingsSection title={t('title')} description={t('description')}>
      {/* Summary */}
      <SettingItem label={t('summary.label')} description={t('summary.description')}>
        <div className="flex gap-4 text-sm">
          <div className="flex flex-col">
            <span className="text-muted-foreground">{t('summary.active')}</span>
            <span className="text-lg font-semibold text-foreground">{activeAliases.length}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">{t('summary.inactive')}</span>
            <span className="text-lg font-semibold text-foreground">{inactiveAliases.length}</span>
          </div>
        </div>
      </SettingItem>

      {/* Create New Alias Button */}
      <SettingItem label={t('create.label')} description={t('create.description')}>
        <button
          onClick={() => {
            setEditingAlias(null);
            setShowAliasModal(true);
            setError(null);
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">{t('create.button')}</span>
        </button>
      </SettingItem>

      {/* Aliases List */}
      {aliases.length > 0 && (
        <div className="mt-6 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">{t('list.title')}</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {aliases.map((alias) => (
              <div
                key={alias.id}
                className="flex items-center justify-between p-3 bg-muted rounded-md hover:bg-accent transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate">{alias.email}</span>
                    {alias.displayName && (
                      <span className="text-xs text-muted-foreground">({alias.displayName})</span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        alias.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {alias.status}
                    </span>
                  </div>
                  {alias.description && (
                    <p className="text-xs text-muted-foreground mt-1">{alias.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 ml-2">
                  {/* Visibility Toggle */}
                  <button
                    onClick={() => {
                      const visibilities: AliasVisibility[] = ['primary', 'alias', 'masked'];
                      const currentIndex = visibilities.indexOf(alias.visibility);
                      const nextVisibility = visibilities[(currentIndex + 1) % visibilities.length];
                      handleChangeVisibility(alias.id, nextVisibility);
                    }}
                    title={getVisibilityLabel(alias.visibility)}
                    className="p-1.5 hover:bg-background rounded transition-colors"
                  >
                    {alias.visibility === 'masked' ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>

                  {/* Edit Button */}
                  <button
                    onClick={() => {
                      setEditingAlias(alias);
                      setShowAliasModal(true);
                      setError(null);
                    }}
                    className="p-1.5 hover:bg-background rounded transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </button>

                  {/* Toggle Status */}
                  <button
                    onClick={() => handleToggleAlias(alias)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      alias.status === 'active'
                        ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-100'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {alias.status === 'active' ? t('actions.deactivate') : t('actions.activate')}
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteAlias(alias.id)}
                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showAliasModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">
              {editingAlias ? t('edit.title') : t('create.title')}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Email Input */}
              {!editingAlias && (
                <div>
                  <label className="block text-sm font-medium mb-1">{t('form.email')}</label>
                  <input
                    type="email"
                    value={newAliasEmail}
                    onChange={(e) => setNewAliasEmail(e.target.value)}
                    placeholder="alias@example.com"
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}

              {/* Display Name Input */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('form.display_name')}</label>
                <input
                  type="text"
                  value={editingAlias ? editingAlias.displayName || '' : newAliasName}
                  onChange={(e) => {
                    if (editingAlias) {
                      setEditingAlias({ ...editingAlias, displayName: e.target.value });
                    } else {
                      setNewAliasName(e.target.value);
                    }
                  }}
                  placeholder={t('form.display_name_placeholder')}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Category Input */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('form.category')}</label>
                <input
                  type="text"
                  value={editingAlias ? editingAlias.category || '' : newAliasCategory}
                  onChange={(e) => {
                    if (editingAlias) {
                      setEditingAlias({ ...editingAlias, category: e.target.value });
                    } else {
                      setNewAliasCategory(e.target.value);
                    }
                  }}
                  placeholder={t('form.category_placeholder')}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Visibility Select */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('form.visibility')}</label>
                <select
                  value={editingAlias ? editingAlias.visibility : newAliasVisibility}
                  onChange={(e) => {
                    const visibility = e.target.value as AliasVisibility;
                    if (editingAlias) {
                      setEditingAlias({ ...editingAlias, visibility });
                    } else {
                      setNewAliasVisibility(visibility);
                    }
                  }}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="primary">{t('visibility.primary')}</option>
                  <option value="alias">{t('visibility.alias')}</option>
                  <option value="masked">{t('visibility.masked')}</option>
                </select>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAliasModal(false);
                  setEditingAlias(null);
                  setError(null);
                }}
                className="flex-1 px-4 py-2 border border-input rounded-md hover:bg-accent transition-colors"
              >
                {t('form.cancel')}
              </button>
              <button
                onClick={editingAlias ? handleUpdateAlias : handleCreateAlias}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                {editingAlias ? t('form.update') : t('form.create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </SettingsSection>
  );
}
