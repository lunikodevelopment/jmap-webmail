'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useContactsStore } from '@/stores/contacts-store';
import { Avatar } from '@/components/ui/avatar';
import type { Contact } from '@/lib/jmap/types';

interface EmailSuggestion extends Contact {
  primaryEmail?: string;
}

interface ContactAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectEmail: (email: string, name?: string) => void;
  placeholder?: string;
  className?: string;
}

export function ContactAutocomplete({
  value,
  onChange,
  onSelectEmail,
  placeholder,
  className,
}: ContactAutocompleteProps) {
  const { contacts } = useContactsStore();
  const [suggestions, setSuggestions] = useState<EmailSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Extract email part if full email string is entered
  const getSearchQuery = (text: string) => {
    // If there are commas, get the last email being typed
    const lastCommaIndex = text.lastIndexOf(',');
    if (lastCommaIndex !== -1) {
      return text.slice(lastCommaIndex + 1).trim();
    }
    return text.trim();
  };

  // Update suggestions based on input
  useEffect(() => {
    const searchQuery = getSearchQuery(value).toLowerCase();

    if (!searchQuery) {
      setSuggestions([]);
      setIsOpen(false);
      setSelectedIndex(-1);
      return;
    }

    // Filter contacts that match the search query
    const filtered = contacts
      .filter(contact =>
        contact.name.toLowerCase().includes(searchQuery) ||
        contact.emails.some(e => e.email.toLowerCase().includes(searchQuery))
      )
      .map(contact => ({
        ...contact,
        primaryEmail: contact.emails[0]?.email,
      }))
      .filter(c => c.primaryEmail) // Only show contacts with at least one email
      .slice(0, 5); // Limit to 5 suggestions

    setSuggestions(filtered);
    setIsOpen(filtered.length > 0);
    setSelectedIndex(-1);
  }, [value, contacts]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && suggestions[selectedIndex]) {
            const suggestion = suggestions[selectedIndex];
            handleSelectSuggestion(suggestion);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, selectedIndex, suggestions]);

  const handleSelectSuggestion = (suggestion: EmailSuggestion) => {
    if (!suggestion.primaryEmail) return;

    const searchQuery = getSearchQuery(value);
    const beforeLastComma = value.slice(0, value.length - searchQuery.length);

    // Build the new value with the selected email
    const newValue = beforeLastComma + suggestion.primaryEmail;
    onChange(newValue);
    onSelectEmail(suggestion.primaryEmail, suggestion.name);

    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        suggestionsRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'To email...'}
        className={`w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary ${className || ''}`}
        autoComplete="off"
      />

      {/* Autocomplete Suggestions */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50"
        >
          <div className="max-h-64 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                onClick={() => handleSelectSuggestion(suggestion)}
                className={`w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-muted transition-colors ${
                  selectedIndex === index ? 'bg-muted' : ''
                }`}
              >
                <Avatar
                  name={suggestion.name}
                  email={suggestion.primaryEmail}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {suggestion.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {suggestion.primaryEmail}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
