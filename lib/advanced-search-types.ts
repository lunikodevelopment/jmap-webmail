/**
 * Advanced Search Types
 * Defines types for advanced email search with multiple filters
 */

export type SearchOperator = 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'between';

export type SearchFieldType = 'from' | 'to' | 'subject' | 'body' | 'date' | 'size' | 'has_attachment' | 'is_read' | 'is_starred' | 'label';

export interface SearchFilter {
  id: string;
  field: SearchFieldType;
  operator: SearchOperator;
  value: string | string[] | number | [number, number]; // For between operator
  caseSensitive?: boolean;
}

export interface AdvancedSearchQuery {
  id: string;
  name: string;
  description?: string;
  filters: SearchFilter[];
  matchAll: boolean; // true = AND, false = OR
  createdAt: Date;
  updatedAt: Date;
  isDefault?: boolean;
}

export interface SearchResult {
  emailId: string;
  matchedFilters: string[]; // IDs of filters that matched
  relevanceScore: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  query: AdvancedSearchQuery;
  resultCount: number;
  lastExecuted?: Date;
}
