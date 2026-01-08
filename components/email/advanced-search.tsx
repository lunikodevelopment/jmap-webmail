"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAdvancedSearchStore } from '@/stores/advanced-search-store';
import { SearchFilter, SearchFieldType, SearchOperator } from '@/lib/advanced-search-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const FIELD_OPTIONS: { value: SearchFieldType; label: string }[] = [
  { value: 'from', label: 'From' },
  { value: 'to', label: 'To' },
  { value: 'subject', label: 'Subject' },
  { value: 'body', label: 'Body' },
  { value: 'date', label: 'Date' },
  { value: 'size', label: 'Size' },
  { value: 'has_attachment', label: 'Has Attachment' },
  { value: 'is_read', label: 'Is Read' },
  { value: 'is_starred', label: 'Is Starred' },
  { value: 'label', label: 'Label' },
];

const OPERATOR_OPTIONS: { value: SearchOperator; label: string }[] = [
  { value: 'contains', label: 'Contains' },
  { value: 'equals', label: 'Equals' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'ends_with', label: 'Ends with' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than', label: 'Less than' },
  { value: 'between', label: 'Between' },
];

export function AdvancedSearch() {
  const t = useTranslations('advanced_search');
  const { currentQuery, addFilter, removeFilter, updateFilter, setMatchAll } = useAdvancedSearchStore();
  const [newFilter, setNewFilter] = useState<Partial<SearchFilter>>({
    field: 'subject',
    operator: 'contains',
    value: '',
  });

  const handleAddFilter = () => {
    if (!newFilter.field || !newFilter.operator || !newFilter.value) return;

    const filter: SearchFilter = {
      id: `filter-${Date.now()}`,
      field: newFilter.field as SearchFieldType,
      operator: newFilter.operator as SearchOperator,
      value: newFilter.value,
      caseSensitive: false,
    };

    addFilter(filter);
    setNewFilter({ field: 'subject', operator: 'contains', value: '' });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t('title')}</h3>
        {currentQuery && currentQuery.filters.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm">
              <input
                type="checkbox"
                checked={currentQuery.matchAll}
                onChange={(e) => setMatchAll(e.target.checked)}
                className="mr-2"
              />
              {t('match_all')}
            </label>
          </div>
        )}
      </div>

      {/* Add Filter Section */}
      <div className="space-y-2 p-3 bg-muted rounded">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <select
            value={newFilter.field || ''}
            onChange={(e) => setNewFilter({ ...newFilter, field: e.target.value as SearchFieldType })}
            className="px-2 py-1 border rounded text-sm"
          >
            {FIELD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={newFilter.operator || ''}
            onChange={(e) => setNewFilter({ ...newFilter, operator: e.target.value as SearchOperator })}
            className="px-2 py-1 border rounded text-sm"
          >
            {OPERATOR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <Input
            type="text"
            placeholder={t('value_placeholder')}
            value={newFilter.value as string}
            onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
            className="text-sm"
          />

          <Button size="sm" onClick={handleAddFilter}>
            {t('add_filter')}
          </Button>
        </div>
      </div>

      {/* Active Filters */}
      {currentQuery && currentQuery.filters.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">{t('active_filters')}</h4>
          <div className="space-y-1">
            {currentQuery.filters.map((filter) => (
              <div
                key={filter.id}
                className="flex items-center justify-between p-2 bg-muted rounded text-sm"
              >
                <span>
                  <strong>{filter.field}</strong> {filter.operator} <em>{String(filter.value)}</em>
                </span>
                <button
                  onClick={() => removeFilter(filter.id)}
                  className="text-destructive hover:underline"
                >
                  {t('remove')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!currentQuery || currentQuery.filters.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('no_filters')}</p>
      )}
    </div>
  );
}
