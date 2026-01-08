import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  PGPKey,
  EncryptedEmail,
  EncryptionSettings,
  EncryptionMethod,
} from '@/lib/email-encryption-types';

interface EmailEncryptionState {
  // Keys
  keys: PGPKey[];
  
  // Encrypted emails
  encryptedEmails: EncryptedEmail[];
  
  // Settings
  settings: EncryptionSettings;
  
  // UI state
  selectedKeyId: string | null;
  
  // Key Actions
  addKey: (key: PGPKey) => void;
  updateKey: (id: string, updates: Partial<PGPKey>) => void;
  deleteKey: (id: string) => void;
  getKey: (id: string) => PGPKey | undefined;
  getKeysByEmail: (email: string) => PGPKey[];
  getPublicKeys: () => PGPKey[];
  getPrivateKeys: () => PGPKey[];
  getDefaultPrivateKey: () => PGPKey | undefined;
  setDefaultPrivateKey: (keyId: string) => void;
  
  // Encrypted Email Actions
  addEncryptedEmail: (email: EncryptedEmail) => void;
  getEncryptedEmail: (emailId: string) => EncryptedEmail | undefined;
  updateEncryptedEmail: (emailId: string, updates: Partial<EncryptedEmail>) => void;
  deleteEncryptedEmail: (emailId: string) => void;
  
  // Settings
  updateSettings: (settings: Partial<EncryptionSettings>) => void;
  getSettings: () => EncryptionSettings;
  
  // Trusted Recipients
  addTrustedRecipient: (email: string) => void;
  removeTrustedRecipient: (email: string) => void;
  isTrustedRecipient: (email: string) => boolean;
  
  // UI
  setSelectedKeyId: (keyId: string | null) => void;
}

const DEFAULT_SETTINGS: EncryptionSettings = {
  enableEncryption: false,
  encryptionMethod: 'pgp',
  autoEncryptToTrustedRecipients: false,
  autoSignEmails: false,
  trustedRecipients: [],
};

export const useEmailEncryptionStore = create<EmailEncryptionState>()(
  persist(
    (set, get) => ({
      keys: [],
      encryptedEmails: [],
      settings: DEFAULT_SETTINGS,
      selectedKeyId: null,

      // Key Actions
      addKey: (key) =>
        set((state) => ({
          keys: [...state.keys, key],
        })),

      updateKey: (id, updates) =>
        set((state) => ({
          keys: state.keys.map((k) =>
            k.id === id ? { ...k, ...updates } : k
          ),
        })),

      deleteKey: (id) =>
        set((state) => ({
          keys: state.keys.filter((k) => k.id !== id),
        })),

      getKey: (id) => {
        const state = get();
        return state.keys.find((k) => k.id === id);
      },

      getKeysByEmail: (email) => {
        const state = get();
        return state.keys.filter((k) => k.email === email);
      },

      getPublicKeys: () => {
        const state = get();
        return state.keys.filter((k) => k.type === 'public');
      },

      getPrivateKeys: () => {
        const state = get();
        return state.keys.filter((k) => k.type === 'private');
      },

      getDefaultPrivateKey: () => {
        const state = get();
        const defaultKeyId = state.settings.defaultPrivateKeyId;
        if (defaultKeyId) {
          return state.keys.find((k) => k.id === defaultKeyId && k.type === 'private');
        }
        return state.keys.find((k) => k.type === 'private' && k.isDefault);
      },

      setDefaultPrivateKey: (keyId) =>
        set((state) => {
          const key = state.keys.find((k) => k.id === keyId);
          if (key && key.type === 'private') {
            return {
              keys: state.keys.map((k) => ({
                ...k,
                isDefault: k.id === keyId,
              })),
              settings: {
                ...state.settings,
                defaultPrivateKeyId: keyId,
              },
            };
          }
          return state;
        }),

      // Encrypted Email Actions
      addEncryptedEmail: (email) =>
        set((state) => ({
          encryptedEmails: [...state.encryptedEmails, email],
        })),

      getEncryptedEmail: (emailId) => {
        const state = get();
        return state.encryptedEmails.find((e) => e.emailId === emailId);
      },

      updateEncryptedEmail: (emailId, updates) =>
        set((state) => ({
          encryptedEmails: state.encryptedEmails.map((e) =>
            e.emailId === emailId ? { ...e, ...updates } : e
          ),
        })),

      deleteEncryptedEmail: (emailId) =>
        set((state) => ({
          encryptedEmails: state.encryptedEmails.filter((e) => e.emailId !== emailId),
        })),

      // Settings
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      getSettings: () => {
        const state = get();
        return state.settings;
      },

      // Trusted Recipients
      addTrustedRecipient: (email) =>
        set((state) => {
          if (!state.settings.trustedRecipients.includes(email)) {
            return {
              settings: {
                ...state.settings,
                trustedRecipients: [...state.settings.trustedRecipients, email],
              },
            };
          }
          return state;
        }),

      removeTrustedRecipient: (email) =>
        set((state) => ({
          settings: {
            ...state.settings,
            trustedRecipients: state.settings.trustedRecipients.filter((e) => e !== email),
          },
        })),

      isTrustedRecipient: (email) => {
        const state = get();
        return state.settings.trustedRecipients.includes(email);
      },

      // UI
      setSelectedKeyId: (keyId) => set({ selectedKeyId: keyId }),
    }),
    {
      name: 'email-encryption-store',
      version: 1,
    }
  )
);
