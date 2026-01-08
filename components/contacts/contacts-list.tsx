'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Plus, Trash2, Edit2 } from 'lucide-react';
import { useContactsStore } from '@/stores/contacts-store';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Contact } from '@/lib/jmap/types';

interface ContactsListProps {
  contacts: Contact[];
  selectedContactId: string | null;
  onSelectContact: (contactId: string) => void;
  onAddContact: () => void;
  onEditContact: (contact: Contact) => void;
  onDeleteContact: (contact: Contact) => void;
  isLoading?: boolean;
  selectedGroupId?: string | null;
}

export function ContactsList({
  contacts,
  selectedContactId,
  onSelectContact,
  onAddContact,
  onEditContact,
  onDeleteContact,
  isLoading = false,
  selectedGroupId = null,
}: ContactsListProps) {
  const t = useTranslations('contacts');
  const { searchQuery, setSearchQuery, contactGroups } = useContactsStore();
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>(contacts);

  React.useEffect(() => {
    let result = contacts;

    // Filter by group if selected
    if (selectedGroupId) {
      const group = contactGroups.find(g => g.id === selectedGroupId);
      if (group) {
        result = result.filter(c => group.memberIds.includes(c.id));
      }
    }

    // Filter by search query
    if (!searchQuery.trim()) {
      setFilteredContacts(result);
    } else {
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = result.filter(contact =>
        contact.name.toLowerCase().includes(lowerQuery) ||
        contact.emails.some(e => e.email.toLowerCase().includes(lowerQuery)) ||
        contact.organization?.toLowerCase().includes(lowerQuery)
      );
      setFilteredContacts(filtered);
    }
  }, [searchQuery, contacts, selectedGroupId, contactGroups]);

  return (
    <div className="flex flex-col h-full bg-background border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-foreground">{t('title')}</h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={onAddContact}
            disabled={isLoading}
            className="ml-auto"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            {t('loading')}
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {searchQuery ? t('no_results') : t('no_contacts')}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedContactId === contact.id ? 'bg-muted' : ''
                }`}
                onClick={() => onSelectContact(contact.id)}
              >
                <div className="flex items-start gap-3">
                  <Avatar
                    name={contact.name}
                    email={contact.emails[0]?.email}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground truncate">
                      {contact.name}
                    </div>
                    {contact.emails.length > 0 && (
                      <div className="text-xs text-muted-foreground truncate">
                        {contact.emails[0].email}
                      </div>
                    )}
                    {contact.organization && (
                      <div className="text-xs text-muted-foreground truncate">
                        {contact.organization}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditContact(contact);
                      }}
                      className="h-6 w-6"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteContact(contact);
                      }}
                      className="h-6 w-6 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
