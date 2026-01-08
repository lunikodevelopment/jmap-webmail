import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  EmailFilter,
  FilterStats,
  generateFilterId,
  FilterCondition,
  FilterAction,
} from "@/lib/filter-types";

interface FilterStore {
  filters: EmailFilter[];
  stats: FilterStats;
  selectedFilterId: string | null;

  // CRUD operations
  createFilter: (
    name: string,
    description?: string
  ) => EmailFilter;
  updateFilter: (id: string, updates: Partial<EmailFilter>) => void;
  deleteFilter: (id: string) => void;
  toggleFilter: (id: string) => void;
  duplicateFilter: (id: string) => EmailFilter | null;

  // Condition operations
  addCondition: (filterId: string) => void;
  updateCondition: (
    filterId: string,
    conditionId: string,
    updates: Partial<FilterCondition>
  ) => void;
  removeCondition: (filterId: string, conditionId: string) => void;

  // Action operations
  addAction: (filterId: string) => void;
  updateAction: (
    filterId: string,
    actionId: string,
    updates: Partial<FilterAction>
  ) => void;
  removeAction: (filterId: string, actionId: string) => void;

  // Selection
  selectFilter: (id: string | null) => void;

  // Reordering
  moveFilter: (fromIndex: number, toIndex: number) => void;

  // Stats
  updateStats: (stats: Partial<FilterStats>) => void;

  // Get helpers
  getFilterById: (id: string) => EmailFilter | undefined;
  getEnabledFilters: () => EmailFilter[];
}

const generateConditionId = () => `cond_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateActionId = () => `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useFilterStore = create<FilterStore>()(
  persist(
    (set, get) => ({
      filters: [],
      stats: {
        totalRules: 0,
        enabledRules: 0,
      },
      selectedFilterId: null,

      createFilter: (name: string, description?: string) => {
        const newFilter: EmailFilter = {
          id: generateFilterId(),
          name,
          description,
          enabled: true,
          priority: get().filters.length,
          conditions: [],
          conditionMatch: "all",
          actions: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          filters: [...state.filters, newFilter],
          stats: {
            ...state.stats,
            totalRules: state.filters.length + 1,
            enabledRules: state.stats.enabledRules + 1,
          },
        }));

        return newFilter;
      },

      updateFilter: (id: string, updates: Partial<EmailFilter>) => {
        set((state) => ({
          filters: state.filters.map((f) =>
            f.id === id
              ? { ...f, ...updates, updatedAt: Date.now() }
              : f
          ),
        }));
      },

      deleteFilter: (id: string) => {
        set((state) => {
          const filter = state.filters.find((f) => f.id === id);
          return {
            filters: state.filters.filter((f) => f.id !== id),
            stats: {
              ...state.stats,
              totalRules: state.filters.length - 1,
              enabledRules: filter?.enabled
                ? state.stats.enabledRules - 1
                : state.stats.enabledRules,
            },
            selectedFilterId:
              state.selectedFilterId === id ? null : state.selectedFilterId,
          };
        });
      },

      toggleFilter: (id: string) => {
        set((state) => ({
          filters: state.filters.map((f) => {
            if (f.id === id) {
              const newEnabled = !f.enabled;
              return { ...f, enabled: newEnabled, updatedAt: Date.now() };
            }
            return f;
          }),
          stats: {
            ...state.stats,
            enabledRules: state.filters.find((f) => f.id === id)?.enabled
              ? state.stats.enabledRules - 1
              : state.stats.enabledRules + 1,
          },
        }));
      },

      duplicateFilter: (id: string) => {
        const original = get().filters.find((f) => f.id === id);
        if (!original) return null;

        const duplicate: EmailFilter = {
          ...original,
          id: generateFilterId(),
          name: `${original.name} (copy)`,
          priority: get().filters.length,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          conditions: original.conditions.map((c) => ({
            ...c,
            id: generateConditionId(),
          })),
          actions: original.actions.map((a) => ({
            ...a,
            id: generateActionId(),
          })),
        };

        set((state) => ({
          filters: [...state.filters, duplicate],
          stats: {
            ...state.stats,
            totalRules: state.filters.length + 1,
            enabledRules: state.stats.enabledRules + (duplicate.enabled ? 1 : 0),
          },
        }));

        return duplicate;
      },

      addCondition: (filterId: string) => {
        set((state) => ({
          filters: state.filters.map((f) =>
            f.id === filterId
              ? {
                  ...f,
                  conditions: [
                    ...f.conditions,
                    {
                      id: generateConditionId(),
                      type: "subject",
                      operator: "contains",
                      value: "",
                    },
                  ],
                  updatedAt: Date.now(),
                }
              : f
          ),
        }));
      },

      updateCondition: (
        filterId: string,
        conditionId: string,
        updates: Partial<FilterCondition>
      ) => {
        set((state) => ({
          filters: state.filters.map((f) =>
            f.id === filterId
              ? {
                  ...f,
                  conditions: f.conditions.map((c) =>
                    c.id === conditionId ? { ...c, ...updates } : c
                  ),
                  updatedAt: Date.now(),
                }
              : f
          ),
        }));
      },

      removeCondition: (filterId: string, conditionId: string) => {
        set((state) => ({
          filters: state.filters.map((f) =>
            f.id === filterId
              ? {
                  ...f,
                  conditions: f.conditions.filter((c) => c.id !== conditionId),
                  updatedAt: Date.now(),
                }
              : f
          ),
        }));
      },

      addAction: (filterId: string) => {
        set((state) => ({
          filters: state.filters.map((f) =>
            f.id === filterId
              ? {
                  ...f,
                  actions: [
                    ...f.actions,
                    {
                      id: generateActionId(),
                      type: "markAsRead",
                    },
                  ],
                  updatedAt: Date.now(),
                }
              : f
          ),
        }));
      },

      updateAction: (
        filterId: string,
        actionId: string,
        updates: Partial<FilterAction>
      ) => {
        set((state) => ({
          filters: state.filters.map((f) =>
            f.id === filterId
              ? {
                  ...f,
                  actions: f.actions.map((a) =>
                    a.id === actionId ? { ...a, ...updates } : a
                  ),
                  updatedAt: Date.now(),
                }
              : f
          ),
        }));
      },

      removeAction: (filterId: string, actionId: string) => {
        set((state) => ({
          filters: state.filters.map((f) =>
            f.id === filterId
              ? {
                  ...f,
                  actions: f.actions.filter((a) => a.id !== actionId),
                  updatedAt: Date.now(),
                }
              : f
          ),
        }));
      },

      selectFilter: (id: string | null) => {
        set({ selectedFilterId: id });
      },

      moveFilter: (fromIndex: number, toIndex: number) => {
        set((state) => {
          const newFilters = [...state.filters];
          const [movedFilter] = newFilters.splice(fromIndex, 1);
          newFilters.splice(toIndex, 0, movedFilter);

          // Update priorities
          return {
            filters: newFilters.map((f, idx) => ({
              ...f,
              priority: idx,
            })),
          };
        });
      },

      updateStats: (stats: Partial<FilterStats>) => {
        set((state) => ({
          stats: { ...state.stats, ...stats },
        }));
      },

      getFilterById: (id: string) => {
        return get().filters.find((f) => f.id === id);
      },

      getEnabledFilters: () => {
        return get().filters.filter((f) => f.enabled);
      },
    }),
    {
      name: "filter-store",
      version: 1,
    }
  )
);
