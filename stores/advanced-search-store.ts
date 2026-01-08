import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AdvancedSearchQuery, SavedSearch, SearchFilter } from '@/lib/advanced-search-types';

interface AdvancedSearchState {
  // Current search query
  currentQuery: AdvancedSearchQuery | null;
  
  // Saved searches
  savedSearches: SavedSearch[];
  
  // Search results
  searchResults: string[]; // Email IDs
  isSearching: boolean;
  
  // Actions
  setCurrentQuery: (query: AdvancedSearchQuery) => void;
  addFilter: (filter: SearchFilter) => void;
  removeFilter: (filterId: string) => void;
  updateFilter: (filterId: string, filter: Partial<SearchFilter>) => void;
  setMatchAll: (matchAll: boolean) => void;
  clearCurrentQuery: () => void;
  
  // Saved searches
  saveSearch: (search: SavedSearch) => void;
  deleteSavedSearch: (searchId: string) => void;
  updateSavedSearch: (searchId: string, search: Partial<SavedSearch>) => void;
  getSavedSearch: (searchId: string) => SavedSearch | undefined;
  
  // Search execution
  setSearchResults: (results: string[]) => void;
  setIsSearching: (isSearching: boolean) => void;
  clearSearchResults: () => void;
}

const initialQuery: AdvancedSearchQuery = {
  id: '',
  name: '',
  filters: [],
  matchAll: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const useAdvancedSearchStore = create<AdvancedSearchState>()(
  persist(
    (set, get) => ({
      currentQuery: null,
      savedSearches: [],
      searchResults: [],
      isSearching: false,

      setCurrentQuery: (query) => set({ currentQuery: query }),

      addFilter: (filter) =>
        set((state) => {
          if (!state.currentQuery) {
            return {
              currentQuery: {
                ...initialQuery,
                id: `query-${Date.now()}`,
                filters: [filter],
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            };
          }
          return {
            currentQuery: {
              ...state.currentQuery,
              filters: [...state.currentQuery.filters, filter],
              updatedAt: new Date(),
            },
          };
        }),

      removeFilter: (filterId) =>
        set((state) => {
          if (!state.currentQuery) return state;
          return {
            currentQuery: {
              ...state.currentQuery,
              filters: state.currentQuery.filters.filter((f) => f.id !== filterId),
              updatedAt: new Date(),
            },
          };
        }),

      updateFilter: (filterId, updates) =>
        set((state) => {
          if (!state.currentQuery) return state;
          return {
            currentQuery: {
              ...state.currentQuery,
              filters: state.currentQuery.filters.map((f) =>
                f.id === filterId ? { ...f, ...updates } : f
              ),
              updatedAt: new Date(),
            },
          };
        }),

      setMatchAll: (matchAll) =>
        set((state) => {
          if (!state.currentQuery) return state;
          return {
            currentQuery: {
              ...state.currentQuery,
              matchAll,
              updatedAt: new Date(),
            },
          };
        }),

      clearCurrentQuery: () => set({ currentQuery: null, searchResults: [] }),

      saveSearch: (search) =>
        set((state) => ({
          savedSearches: [...state.savedSearches, search],
        })),

      deleteSavedSearch: (searchId) =>
        set((state) => ({
          savedSearches: state.savedSearches.filter((s) => s.id !== searchId),
        })),

      updateSavedSearch: (searchId, updates) =>
        set((state) => ({
          savedSearches: state.savedSearches.map((s) =>
            s.id === searchId ? { ...s, ...updates } : s
          ),
        })),

      getSavedSearch: (searchId) => {
        const state = get();
        return state.savedSearches.find((s) => s.id === searchId);
      },

      setSearchResults: (results) => set({ searchResults: results }),

      setIsSearching: (isSearching) => set({ isSearching }),

      clearSearchResults: () => set({ searchResults: [] }),
    }),
    {
      name: 'advanced-search-store',
      version: 1,
    }
  )
);
