'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Contact, ContactEmail, ContactPhone } from '@/lib/jmap/types';

interface ContactDetailsProps {
  contact: Contact | null;
  isLoading?: boolean;
  onSave: (contact: Omit<Contact, 'id'>) => Promise<void>;
  onClose: () => void;
}

export function ContactDetails({
  contact,
  isLoading = false,
  onSave,
  onClose,
}: ContactDetailsProps) {
  const t = useTranslations('contacts');
  const [formData, setFormData] = useState<Omit<Contact, 'id'>>({
    uid: '',
    name: '',
    firstName: '',
    lastName: '',
    emails: [],
    phones: [],
    addresses: [],
    organization: '',
    jobTitle: '',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (contact) {
      setFormData({
        uid: contact.uid,
        name: contact.name,
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        emails: contact.emails || [],
        phones: contact.phones || [],
        addresses: contact.addresses || [],
        organization: contact.organization || '',
        jobTitle: contact.jobTitle || '',
        notes: contact.notes || '',
      });
    } else {
      setFormData({
        uid: `contact-${Date.now()}`,
        name: '',
        firstName: '',
        lastName: '',
        emails: [{ type: 'other', email: '' }],
        phones: [],
        addresses: [],
        organization: '',
        jobTitle: '',
        notes: '',
      });
    }
  }, [contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const addEmail = () => {
    setFormData(prev => ({
      ...prev,
      emails: [...prev.emails, { type: 'other', email: '' }],
    }));
  };

  const removeEmail = (index: number) => {
    setFormData(prev => ({
      ...prev,
      emails: prev.emails.filter((_, i) => i !== index),
    }));
  };

  const updateEmail = (index: number, field: keyof ContactEmail, value: any) => {
    setFormData(prev => ({
      ...prev,
      emails: prev.emails.map((e, i) =>
        i === index ? { ...e, [field]: value } : e
      ),
    }));
  };

  const addPhone = () => {
    setFormData(prev => ({
      ...prev,
      phones: [...(prev.phones || []), { type: 'other', number: '' }],
    }));
  };

  const removePhone = (index: number) => {
    setFormData(prev => ({
      ...prev,
      phones: (prev.phones || []).filter((_, i) => i !== index),
    }));
  };

  const updatePhone = (index: number, field: keyof ContactPhone, value: any) => {
    setFormData(prev => ({
      ...prev,
      phones: (prev.phones || []).map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      ),
    }));
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">
          {contact ? t('edit_contact') : t('new_contact')}
        </h3>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          disabled={isSaving}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name Fields */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">{t('full_name')}</label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder={t('full_name_placeholder')}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('first_name')}</label>
            <Input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              placeholder={t('first_name')}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('last_name')}</label>
            <Input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              placeholder={t('last_name')}
            />
          </div>
        </div>

        {/* Organization */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">{t('organization')}</label>
          <Input
            type="text"
            value={formData.organization}
            onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
            placeholder={t('organization')}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">{t('job_title')}</label>
          <Input
            type="text"
            value={formData.jobTitle}
            onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
            placeholder={t('job_title')}
          />
        </div>

        {/* Emails */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">{t('emails')}</label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={addEmail}
              className="h-6 gap-1"
            >
              <Plus className="w-3 h-3" />
              {t('add')}
            </Button>
          </div>
          <div className="space-y-2">
            {formData.emails.map((email, index) => (
              <div key={index} className="flex gap-2">
                <select
                  value={email.type || 'other'}
                  onChange={(e) => updateEmail(index, 'type', e.target.value as 'home' | 'work' | 'other' | undefined)}
                  className="px-2 py-1 border border-border rounded text-sm bg-background text-foreground"
                >
                  <option value="home">{t('type_home')}</option>
                  <option value="work">{t('type_work')}</option>
                  <option value="other">{t('type_other')}</option>
                </select>
                <Input
                  type="email"
                  value={email.email}
                  onChange={(e) => updateEmail(index, 'email', e.target.value)}
                  placeholder={t('email')}
                  className="flex-1"
                />
                {formData.emails.length > 1 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeEmail(index)}
                    className="h-9 w-9 text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Phones */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">{t('phones')}</label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={addPhone}
              className="h-6 gap-1"
            >
              <Plus className="w-3 h-3" />
              {t('add')}
            </Button>
          </div>
          <div className="space-y-2">
            {formData.phones?.map((phone, index) => (
              <div key={index} className="flex gap-2">
                <select
                  value={phone.type || 'other'}
                  onChange={(e) => updatePhone(index, 'type', e.target.value as 'home' | 'work' | 'mobile' | 'fax' | 'pager' | 'other' | undefined)}
                  className="px-2 py-1 border border-border rounded text-sm bg-background text-foreground"
                >
                  <option value="home">{t('type_home')}</option>
                  <option value="work">{t('type_work')}</option>
                  <option value="mobile">{t('type_mobile')}</option>
                  <option value="fax">{t('type_fax')}</option>
                  <option value="other">{t('type_other')}</option>
                </select>
                <Input
                  type="tel"
                  value={phone.number}
                  onChange={(e) => updatePhone(index, 'number', e.target.value)}
                  placeholder={t('phone')}
                  className="flex-1"
                />
                {formData.phones && formData.phones.length > 1 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removePhone(index)}
                    className="h-9 w-9 text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">{t('notes')}</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder={t('notes')}
            rows={4}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </form>

      {/* Footer */}
      <div className="flex gap-2 p-4 border-t border-border">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isSaving}
          className="flex-1"
        >
          {t('cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSaving}
          className="flex-1"
        >
          {isSaving ? t('saving') : t('save')}
        </Button>
      </div>
    </div>
  );
}
