'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useContactsStore } from '@/stores/contacts-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronRight, Plus, Trash2, Edit2 } from 'lucide-react';
import type { ContactGroup } from '@/lib/jmap/types';

interface ContactGroupsProps {
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
}

export function ContactGroups({ selectedGroupId, onSelectGroup }: ContactGroupsProps) {
  const t = useTranslations();
  const {
    contactGroups,
    createGroup,
    updateGroup,
    deleteGroup,
  } = useContactsStore();

  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;

    createGroup({
      name: newGroupName,
      description: '',
      memberIds: [],
    });

    setNewGroupName('');
    setShowNewGroup(false);
  };

  const handleUpdateGroup = (groupId: string) => {
    if (!editingName.trim()) return;

    updateGroup(groupId, {
      name: editingName,
    });

    setEditingGroupId(null);
    setEditingName('');
  };

  const handleDeleteGroup = (groupId: string) => {
    if (window.confirm(t('contacts.confirm_delete_group') || 'Delete this group?')) {
      deleteGroup(groupId);
      if (selectedGroupId === groupId) {
        onSelectGroup(null);
      }
    }
  };

  const toggleExpandGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const handleGroupClick = (groupId: string) => {
    onSelectGroup(selectedGroupId === groupId ? null : groupId);
  };

  if (contactGroups.length === 0 && !showNewGroup) {
    return (
      <Button
        onClick={() => setShowNewGroup(true)}
        variant="outline"
        size="sm"
        className="w-full flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        {t('contacts.create_group')}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t('contacts.groups')}
        </h3>
        {!showNewGroup && (
          <Button
            onClick={() => setShowNewGroup(true)}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            <Plus className="w-3 h-3" />
          </Button>
        )}
      </div>

      {showNewGroup && (
        <div className="p-2 bg-muted rounded space-y-2">
          <Input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder={t('contacts.group_name_placeholder')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateGroup();
              } else if (e.key === 'Escape') {
                setShowNewGroup(false);
                setNewGroupName('');
              }
            }}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              onClick={handleCreateGroup}
              size="sm"
              className="flex-1"
            >
              {t('contacts.create')}
            </Button>
            <Button
              onClick={() => {
                setShowNewGroup(false);
                setNewGroupName('');
              }}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {contactGroups.map((group) => (
          <div key={group.id}>
            <div
              className={`flex items-center gap-1 px-2 py-1.5 rounded hover:bg-muted cursor-pointer transition-colors ${
                selectedGroupId === group.id ? 'bg-muted' : ''
              }`}
            >
              <button
                onClick={() => toggleExpandGroup(group.id)}
                className="p-0.5 hover:bg-background rounded"
              >
                {expandedGroups.has(group.id) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {editingGroupId === group.id ? (
                <div className="flex-1 flex gap-1">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="h-6 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUpdateGroup(group.id);
                      } else if (e.key === 'Escape') {
                        setEditingGroupId(null);
                        setEditingName('');
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    onClick={() => handleUpdateGroup(group.id)}
                    size="sm"
                    className="h-6 px-2"
                  >
                    {t('common.save')}
                  </Button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleGroupClick(group.id)}
                    className="flex-1 text-left text-sm truncate hover:underline"
                  >
                    {group.name}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    ({group.memberIds.length})
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingGroupId(group.id);
                      setEditingName(group.name);
                    }}
                    className="p-0.5 hover:bg-background rounded"
                    title={t('common.edit')}
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGroup(group.id);
                    }}
                    className="p-0.5 hover:bg-background rounded text-destructive hover:text-destructive"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>

            {expandedGroups.has(group.id) && (
              <div className="ml-6 text-xs text-muted-foreground py-1">
                {group.memberIds.length === 0 ? (
                  <p>{t('contacts.no_members')}</p>
                ) : (
                  <p>{t('contacts.members_count', { count: group.memberIds.length })}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
