'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useContactsStore } from '@/stores/contacts-store';
import { ContactsList } from '@/components/contacts/contacts-list';
import { ContactDetails } from '@/components/contacts/contact-details';
import { ContactImportExport } from '@/components/contacts/contact-import-export';
import { ContactGroups } from '@/components/contacts/contact-groups';
import { GroupMembers } from '@/components/contacts/group-members';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import type { Contact } from '@/lib/jmap/types';

export default function ContactsPage() {
  const t = useTranslations();
  const router = useRouter();
  const { client, isAuthenticated } = useAuthStore();
  const {
    contacts,
    selectedContactId,
    isLoading,
    error,
    setSelectedContact,
    selectedGroupId,
    setSelectedGroup,
    contactGroups,
    fetchContacts,
    createContact,
    updateContact,
    deleteContact,
    clearError,
    initializeSync,
    syncContacts,
    lastSyncTime,
    supportsSync,
    isSyncing,
  } = useContactsStore();

  const [selectedContact, setSelectedContactLocal] = useState<Contact | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showGroupMembers, setShowGroupMembers] = useState(false);

  // Initialize sync and fetch contacts on mount
  useEffect(() => {
    if (client && isAuthenticated) {
      console.log('Initializing contacts sync with client:', client);
      void initializeSync(client);
    } else {
      console.log('Not initializing sync. Client:', !!client, 'Authenticated:', isAuthenticated);
    }
  }, [client, isAuthenticated]);

  // Update selected contact when selectedContactId changes
  useEffect(() => {
    if (selectedContactId) {
      const contact = contacts.find(c => c.id === selectedContactId);
      setSelectedContactLocal(contact || null);
    } else {
      setSelectedContactLocal(null);
    }
  }, [selectedContactId, contacts]);

  const handleSelectContact = (contactId: string) => {
    setSelectedContact(contactId);
    setShowForm(true);
  };

  const handleAddContact = () => {
    setSelectedContact(null);
    setSelectedContactLocal(null);
    setShowForm(true);
  };

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact.id);
    setSelectedContactLocal(contact);
    setShowForm(true);
  };

  const handleSaveContact = async (contact: Omit<Contact, 'id'>) => {
    if (!client) return;

    try {
      if (selectedContactId) {
        await updateContact(client, selectedContactId, contact);
      } else {
        await createContact(client, contact);
      }
      setShowForm(false);
      setSelectedContact(null);
    } catch (error) {
      console.error('Failed to save contact:', error);
    }
  };

  const handleDeleteContact = async (contact: Contact) => {
    if (!client) return;

    if (!window.confirm(t('contacts.confirm_delete'))) {
      return;
    }

    try {
      await deleteContact(client, contact.id);
      setShowForm(false);
      setSelectedContact(null);
    } catch (error) {
      console.error('Failed to delete contact:', error);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedContact(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground">{t('login.loading')}</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left: Contacts List */}
      <div className="w-64 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <button
            onClick={() => router.push('/')}
            className="p-1 hover:bg-muted rounded transition-colors"
            title={t('common.back') || 'Back to email'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="flex-1 font-semibold">{t('contacts.title')}</h2>
          {supportsSync && (
            <button
              onClick={() => client && syncContacts(client)}
              disabled={isSyncing}
              className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-50"
              title={t('contacts.sync_contacts') || 'Sync contacts'}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {supportsSync && lastSyncTime && (
          <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
            {t('contacts.last_synced')}: {new Date(lastSyncTime).toLocaleTimeString()}
          </div>
        )}
        
        <div className="p-4 border-b border-border">
          <ContactImportExport contacts={contacts} />
        </div>

        <div className="p-4 border-b border-border">
          <ContactGroups
            selectedGroupId={selectedGroupId}
            onSelectGroup={setSelectedGroup}
          />
        </div>

        <ContactsList
          contacts={contacts}
          selectedContactId={selectedContactId}
          onSelectContact={handleSelectContact}
          onAddContact={handleAddContact}
          onEditContact={handleEditContact}
          onDeleteContact={handleDeleteContact}
          isLoading={isLoading}
          selectedGroupId={selectedGroupId}
        />
      </div>

      {/* Right: Contact Details or Empty State */}
      <div className="flex-1 flex flex-col">
        {error && (
          <div className="m-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-destructive">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-sm text-destructive hover:underline"
            >
              {t('common.dismiss')}
            </button>
          </div>
        )}

        {showForm && (
          <ContactDetails
            contact={selectedContact}
            isLoading={isLoading}
            onSave={handleSaveContact}
            onClose={handleCloseForm}
          />
        )}

        {!showForm && !selectedContact && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              {selectedGroupId && contactGroups.find(g => g.id === selectedGroupId) && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {t('contacts.viewing_group')}: {contactGroups.find(g => g.id === selectedGroupId)?.name}
                  </p>
                  <button
                    onClick={() => setShowGroupMembers(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    {t('contacts.manage_members')}
                  </button>
                </div>
              )}
              <p className="text-lg font-medium text-foreground mb-2">
                {t('contacts.select_contact')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('contacts.select_or_create')}
              </p>
            </div>
          </div>
        )}

        {!showForm && selectedContact && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl">
              {/* Contact Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-1">
                    {selectedContact.name}
                  </h1>
                  {selectedContact.organization && (
                    <p className="text-muted-foreground">{selectedContact.organization}</p>
                  )}
                  {selectedContact.jobTitle && (
                    <p className="text-sm text-muted-foreground">{selectedContact.jobTitle}</p>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-6">
                {/* Emails */}
                {selectedContact.emails && selectedContact.emails.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">
                      {t('contacts.emails')}
                    </h3>
                    <div className="space-y-2">
                      {selectedContact.emails.map((email, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
                            {email.type || 'other'}
                          </span>
                          <a
                            href={`mailto:${email.email}`}
                            className="text-primary hover:underline"
                          >
                            {email.email}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phones */}
                {selectedContact.phones && selectedContact.phones.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">
                      {t('contacts.phones')}
                    </h3>
                    <div className="space-y-2">
                      {selectedContact.phones.map((phone, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
                            {phone.type || 'other'}
                          </span>
                          <a
                            href={`tel:${phone.number}`}
                            className="text-primary hover:underline"
                          >
                            {phone.number}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedContact.notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">
                      {t('contacts.notes')}
                    </h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedContact.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showGroupMembers && selectedGroupId && (
        <GroupMembers
          group={contactGroups.find(g => g.id === selectedGroupId)!}
          contacts={contacts}
          onClose={() => setShowGroupMembers(false)}
        />
      )}
    </div>
  );
}
