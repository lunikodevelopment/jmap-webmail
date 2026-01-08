import { create } from "zustand";
import { persist } from "zustand/middleware";
import { EmailSignature, SignatureSettings, generateSignatureId } from "@/lib/signature-types";

interface SignatureStore {
  signatures: EmailSignature[];
  settings: SignatureSettings;
  selectedSignatureId: string | null;
  isLoading: boolean;
  error: string | null;

  // CRUD operations
  createSignature: (signature: Omit<EmailSignature, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSignature: (id: string, updates: Partial<EmailSignature>) => void;
  deleteSignature: (id: string) => void;
  getSignature: (id: string) => EmailSignature | undefined;
  getSignaturesByIdentity: (identityId: string) => EmailSignature[];
  getDefaultSignature: (identityId: string) => EmailSignature | undefined;

  // Selection
  selectSignature: (id: string | null) => void;
  setDefaultSignature: (id: string, identityId: string) => void;

  // Settings
  updateSettings: (settings: Partial<SignatureSettings>) => void;

  // UI state
  setError: (error: string | null) => void;
  clearError: () => void;
}

const DEFAULT_SETTINGS: SignatureSettings = {
  autoAppendSignature: true,
  autoAppendToReplies: false,
  autoAppendToForwards: false,
  separatorStyle: 'dashes',
};

export const useSignatureStore = create<SignatureStore>()(
  persist(
    (set, get) => ({
      signatures: [],
      settings: DEFAULT_SETTINGS,
      selectedSignatureId: null,
      isLoading: false,
      error: null,

      createSignature: (signature) => {
        const newSignature: EmailSignature = {
          id: generateSignatureId(),
          ...signature,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          signatures: [...state.signatures, newSignature],
        }));
      },

      updateSignature: (id, updates) => {
        set((state) => ({
          signatures: state.signatures.map((s) => {
            if (s.id === id) {
              return { ...s, ...updates, updatedAt: Date.now() };
            }
            return s;
          }),
        }));
      },

      deleteSignature: (id) => {
        set((state) => ({
          signatures: state.signatures.filter((s) => s.id !== id),
          selectedSignatureId: state.selectedSignatureId === id ? null : state.selectedSignatureId,
        }));
      },

      getSignature: (id) => {
        return get().signatures.find((s) => s.id === id);
      },

      getSignaturesByIdentity: (identityId) => {
        return get().signatures.filter((s) => s.identityId === identityId);
      },

      getDefaultSignature: (identityId) => {
        return get().signatures.find((s) => s.identityId === identityId && s.isDefault);
      },

      selectSignature: (id) => {
        set({ selectedSignatureId: id });
      },

      setDefaultSignature: (id, identityId) => {
        set((state) => ({
          signatures: state.signatures.map((s) => {
            if (s.identityId === identityId) {
              return { ...s, isDefault: s.id === id };
            }
            return s;
          }),
        }));
      },

      updateSettings: (settings) => {
        set((state) => ({
          settings: { ...state.settings, ...settings },
        }));
      },

      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "signature-store",
      version: 1,
    }
  )
);
