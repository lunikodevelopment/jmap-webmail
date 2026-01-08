'use client';

import React, { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useContactsStore } from '@/stores/contacts-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { downloadVCard, parseVCards, generateUUID } from '@/lib/vcard-utils';
import type { Contact } from '@/lib/jmap/types';

interface ContactImportExportProps {
  contacts: Contact[];
}

export function ContactImportExport({ contacts }: ContactImportExportProps) {
  const t = useTranslations();
  const { client } = useAuthStore();
  const { createContact } = useContactsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = React.useState(false);
  const [importError, setImportError] = React.useState<string | null>(null);
  const [importSuccess, setImportSuccess] = React.useState<number>(0);

  const handleExport = () => {
    if (contacts.length === 0) {
      alert(t('contacts.no_contacts_to_export') || 'No contacts to export');
      return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    downloadVCard(contacts, `contacts-${timestamp}.vcf`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.vcf') && file.type !== 'text/vcard' && file.type !== 'text/plain') {
      setImportError(t('contacts.invalid_file_type') || 'Invalid file type. Please select a .vcf file.');
      return;
    }

    setImporting(true);
    setImportError(null);
    setImportSuccess(0);

    try {
      const fileContent = await file.text();
      const parsedContacts = parseVCards(fileContent);

      if (parsedContacts.length === 0) {
        setImportError(t('contacts.no_contacts_found') || 'No contacts found in the file.');
        setImporting(false);
        return;
      }

      if (!client) {
        setImportError(t('contacts.client_not_ready') || 'Client is not ready. Please try again.');
        setImporting(false);
        return;
      }

      // Import contacts one by one
      let successCount = 0;
      for (const contactData of parsedContacts) {
        try {
          // Fill in any missing required fields
          const contactToImport: Omit<Contact, 'id'> = {
            uid: contactData.uid || `urn:uuid:${generateUUID()}`,
            name: contactData.name || contactData.firstName || 'Unnamed Contact',
            firstName: contactData.firstName || '',
            lastName: contactData.lastName || '',
            emails: contactData.emails || [],
            phones: contactData.phones || [],
            addresses: contactData.addresses || [],
            organization: contactData.organization || '',
            jobTitle: contactData.jobTitle || '',
            notes: contactData.notes || '',
            avatar: contactData.avatar || '',
            categories: contactData.categories || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await createContact(client, contactToImport);
          successCount++;
        } catch (err) {
          console.error('Error importing contact:', err);
        }
      }

      setImportSuccess(successCount);

      if (successCount === 0) {
        setImportError(t('contacts.import_failed') || 'Failed to import any contacts.');
      }
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : t('contacts.import_error') || 'An error occurred during import.'
      );
    } finally {
      setImporting(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          onClick={handleExport}
          variant="outline"
          size="sm"
          disabled={contacts.length === 0}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          {t('contacts.export')}
        </Button>

        <Button
          onClick={handleImportClick}
          variant="outline"
          size="sm"
          disabled={importing}
          className="flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {importing ? t('contacts.importing') : t('contacts.import')}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".vcf,text/vcard"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {importError && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
          {importError}
        </div>
      )}

      {importSuccess > 0 && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded text-sm text-green-700 dark:text-green-400">
          {t('contacts.imported_count', { count: importSuccess }) ||
            `Successfully imported ${importSuccess} contact(s)`}
        </div>
      )}
    </div>
  );
}
