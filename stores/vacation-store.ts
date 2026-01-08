import { create } from "zustand";
import { persist } from "zustand/middleware";
import { VacationResponder, VacationResponderSettings, generateVacationId } from "@/lib/vacation-types";

interface VacationStore {
  responders: VacationResponder[];
  settings: VacationResponderSettings;
  selectedResponderId: string | null;
  isLoading: boolean;
  error: string | null;

  // CRUD operations
  createResponder: (responder: Omit<VacationResponder, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateResponder: (id: string, updates: Partial<VacationResponder>) => void;
  deleteResponder: (id: string) => void;
  getResponder: (id: string) => VacationResponder | undefined;
  getRespondersByIdentity: (identityId: string) => VacationResponder[];
  getActiveResponder: (identityId: string) => VacationResponder | undefined;

  // Selection
  selectResponder: (id: string | null) => void;

  // Settings
  updateSettings: (settings: Partial<VacationResponderSettings>) => void;

  // UI state
  setError: (error: string | null) => void;
  clearError: () => void;
}

const DEFAULT_SETTINGS: VacationResponderSettings = {
  autoDisableOnReturn: true,
  notifyOnResponses: true,
};

export const useVacationStore = create<VacationStore>()(
  persist(
    (set, get) => ({
      responders: [],
      settings: DEFAULT_SETTINGS,
      selectedResponderId: null,
      isLoading: false,
      error: null,

      createResponder: (responder) => {
        const newResponder: VacationResponder = {
          id: generateVacationId(),
          ...responder,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          responders: [...state.responders, newResponder],
        }));
      },

      updateResponder: (id, updates) => {
        set((state) => ({
          responders: state.responders.map((r) => {
            if (r.id === id) {
              return { ...r, ...updates, updatedAt: Date.now() };
            }
            return r;
          }),
        }));
      },

      deleteResponder: (id) => {
        set((state) => ({
          responders: state.responders.filter((r) => r.id !== id),
          selectedResponderId: state.selectedResponderId === id ? null : state.selectedResponderId,
        }));
      },

      getResponder: (id) => {
        return get().responders.find((r) => r.id === id);
      },

      getRespondersByIdentity: (identityId) => {
        return get().responders.filter((r) => r.identityId === identityId);
      },

      getActiveResponder: (identityId) => {
        const now = Date.now();
        return get().responders.find(
          (r) => r.identityId === identityId && r.isEnabled && r.startDate <= now && r.endDate >= now
        );
      },

      selectResponder: (id) => {
        set({ selectedResponderId: id });
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
      name: "vacation-store",
      version: 1,
    }
  )
);
