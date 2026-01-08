'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useContactsStore } from '@/stores/contacts-store';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { X } from 'lucide-react';
import type { Contact, ContactGroup } from '@/lib/jmap/types';

interface GroupMembersProps {
  group: ContactGroup;
  contacts: Contact[];
  onClose: () => void;
}

export function GroupMembers({ group, contacts, onClose }: GroupMembersProps) {
  const t = useTranslations();
  const { addContactToGroup, removeContactFromGroup } = useContactsStore();
  const [searchTerm, setSearchTerm] = useState('');

  const groupMembers = contacts.filter(c => group.memberIds.includes(c.id));
  const nonMembers = contacts.filter(c => !group.memberIds.includes(c.id));

  const filteredNonMembers = nonMembers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.emails.some(e => e.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddMember = (contactId: string) => {
    addContactToGroup(contactId, group.id);
  };

  const handleRemoveMember = (contactId: string) => {
    removeContactFromGroup(contactId, group.id);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg shadow-lg max-w-md w-full max-h-96 flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">{t('contacts.manage_members')} - {group.name}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Current Members */}
          {groupMembers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">{t('contacts.current_members')}</h3>
              <div className="space-y-1">
                {groupMembers.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 p-2 bg-muted rounded"
                  >
                    <Avatar name={member.name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.name}</p>
                      {member.emails[0] && (
                        <p className="text-xs text-muted-foreground truncate">{member.emails[0].email}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-1 hover:bg-background rounded text-destructive"
                      title={t('contacts.remove_from_group')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Members */}
          {nonMembers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">{t('contacts.add_members')}</h3>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('contacts.search_contacts')}
                className="w-full px-3 py-2 text-sm border border-border rounded mb-2 bg-background"
              />
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {filteredNonMembers.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => handleAddMember(contact.id)}
                    className="w-full flex items-center gap-2 p-2 hover:bg-muted rounded text-left transition-colors"
                  >
                    <Avatar name={contact.name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{contact.name}</p>
                      {contact.emails[0] && (
                        <p className="text-xs text-muted-foreground truncate">{contact.emails[0].email}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {nonMembers.length === 0 && groupMembers.length > 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              {t('contacts.all_contacts_in_group')}
            </p>
          )}
        </div>

        <div className="p-4 border-t border-border">
          <Button onClick={onClose} className="w-full">
            {t('common.close')}
          </Button>
        </div>
      </div>
    </div>
  );
}
