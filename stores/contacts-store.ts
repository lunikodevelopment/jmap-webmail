import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { JMAPClient } from '@/lib/jmap/client';
import type { Contact, ContactGroup } from '@/lib/jmap/types';

interface ContactsStore {
  contacts: Contact[];
  contactGroups: ContactGroup[];
  selectedContactId: string | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedGroupId: string | null;

  // Contacts operations
  fetchContacts: (client: JMAPClient) => Promise<void>;
  getContact: (contactId: string) => Contact | undefined;
  createContact: (client: JMAPClient, contact: Omit<Contact, 'id'>) => Promise<void>;
  updateContact: (client: JMAPClient, contactId: string, contact: Partial<Contact>) => Promise<void>;
  deleteContact: (client: JMAPClient, contactId: string) => Promise<void>;
  searchContacts: (query: string) => Contact[];

  // Groups operations
  createGroup: (group: Omit<ContactGroup, 'id'>) => void;
  updateGroup: (groupId: string, group: Partial<ContactGroup>) => void;
  deleteGroup: (groupId: string) => void;
  addContactToGroup: (contactId: string, groupId: string) => void;
  removeContactFromGroup: (contactId: string, groupId: string) => void;

  // UI state
  setSelectedContact: (contactId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedGroup: (groupId: string | null) => void;
  clearError: () => void;
}

export const useContactsStore = create<ContactsStore>()(
  persist(
    (set, get) => ({
      contacts: [],
      contactGroups: [],
      selectedContactId: null,
      isLoading: false,
      error: null,
      searchQuery: '',
      selectedGroupId: null,

      fetchContacts: async (client) => {
        set({ isLoading: true, error: null });
        try {
          console.log('Fetching contacts from JMAP...');
          const contacts = await client.getContacts();
          console.log('Contacts fetched:', contacts);
          set({ contacts, isLoading: false });
        } catch (error) {
          console.error('Error fetching contacts:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch contacts',
            isLoading: false,
          });
        }
      },

      getContact: (contactId) => {
        return get().contacts.find(c => c.id === contactId);
      },

      createContact: async (client, contact) => {
        set({ isLoading: true, error: null });
        try {
          const newContactId = await client.createContact(contact);
          const newContact = await client.getContact(newContactId);
          if (newContact) {
            set(state => ({
              contacts: [...state.contacts, newContact],
              isLoading: false,
            }));
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create contact',
            isLoading: false,
          });
          throw error;
        }
      },

      updateContact: async (client, contactId, contact) => {
        set({ isLoading: true, error: null });
        try {
          await client.updateContact(contactId, contact);
          const updatedContact = await client.getContact(contactId);
          if (updatedContact) {
            set(state => ({
              contacts: state.contacts.map(c => c.id === contactId ? updatedContact : c),
              isLoading: false,
            }));
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update contact',
            isLoading: false,
          });
          throw error;
        }
      },

      deleteContact: async (client, contactId) => {
        set({ isLoading: true, error: null });
        try {
          await client.deleteContact(contactId);
          set(state => ({
            contacts: state.contacts.filter(c => c.id !== contactId),
            selectedContactId: state.selectedContactId === contactId ? null : state.selectedContactId,
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete contact',
            isLoading: false,
          });
          throw error;
        }
      },

      searchContacts: (query) => {
        if (!query.trim()) {
          return get().contacts;
        }

        const lowerQuery = query.toLowerCase();
        return get().contacts.filter(contact =>
          contact.name.toLowerCase().includes(lowerQuery) ||
          contact.emails.some(e => e.email.toLowerCase().includes(lowerQuery)) ||
          contact.organization?.toLowerCase().includes(lowerQuery) ||
          contact.phones?.some(p => p.number.includes(query))
        );
      },

      createGroup: (group) => {
        const newGroup: ContactGroup = {
          id: `group-${Date.now()}`,
          ...group,
        };
        set(state => ({
          contactGroups: [...state.contactGroups, newGroup],
        }));
      },

      updateGroup: (groupId, group) => {
        set(state => ({
          contactGroups: state.contactGroups.map(g =>
            g.id === groupId ? { ...g, ...group } : g
          ),
        }));
      },

      deleteGroup: (groupId) => {
        set(state => ({
          contactGroups: state.contactGroups.filter(g => g.id !== groupId),
          selectedGroupId: state.selectedGroupId === groupId ? null : state.selectedGroupId,
        }));
      },

      addContactToGroup: (contactId, groupId) => {
        set(state => ({
          contactGroups: state.contactGroups.map(g =>
            g.id === groupId && !g.memberIds.includes(contactId)
              ? { ...g, memberIds: [...g.memberIds, contactId] }
              : g
          ),
        }));
      },

      removeContactFromGroup: (contactId, groupId) => {
        set(state => ({
          contactGroups: state.contactGroups.map(g =>
            g.id === groupId
              ? { ...g, memberIds: g.memberIds.filter(id => id !== contactId) }
              : g
          ),
        }));
      },

      setSelectedContact: (contactId) => {
        set({ selectedContactId: contactId });
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      setSelectedGroup: (groupId) => {
        set({ selectedGroupId: groupId });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'contacts-store',
      partialize: (state) => ({
        contactGroups: state.contactGroups,
        selectedGroupId: state.selectedGroupId,
      }),
    }
  )
);
