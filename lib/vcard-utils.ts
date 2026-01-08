import type { Contact } from './jmap/types';

/**
 * Generate a UUID v4 string
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Convert a Contact object to vCard (RFC 5545) format
 */
export function contactToVCard(contact: Contact): string {
  const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0'];

  // UID
  if (contact.uid) {
    lines.push(`UID:${escapeVCardValue(contact.uid)}`);
  }

  // FN (full name)
  if (contact.name) {
    lines.push(`FN:${escapeVCardValue(contact.name)}`);
  }

  // N (structured name)
  if (contact.lastName || contact.firstName) {
    const n = `${contact.lastName || ''};${contact.firstName || ''};;;`;
    lines.push(`N:${n}`);
  }

  // EMAIL
  contact.emails.forEach((email, index) => {
    const type = email.type && email.type !== 'other' ? email.type.toUpperCase() : 'HOME';
    lines.push(`EMAIL;TYPE=${type}:${escapeVCardValue(email.email)}`);
  });

  // TEL (phone)
  if (contact.phones) {
    contact.phones.forEach((phone) => {
      const type = phone.type && phone.type !== 'other' ? phone.type.toUpperCase() : 'VOICE';
      lines.push(`TEL;TYPE=${type}:${escapeVCardValue(phone.number)}`);
    });
  }

  // ORG (organization)
  if (contact.organization) {
    lines.push(`ORG:${escapeVCardValue(contact.organization)}`);
  }

  // TITLE (job title)
  if (contact.jobTitle) {
    lines.push(`TITLE:${escapeVCardValue(contact.jobTitle)}`);
  }

  // NOTE
  if (contact.notes) {
    lines.push(`NOTE:${escapeVCardValue(contact.notes)}`);
  }

  // ADR (address)
  if (contact.addresses) {
    contact.addresses.forEach((address) => {
      const type = address.type && address.type !== 'other' ? address.type.toUpperCase() : 'HOME';
      const adr = `;;${address.street || ''};${address.city || ''};${address.region || ''};${address.postcode || ''};${address.country || ''}`;
      lines.push(`ADR;TYPE=${type}:${adr}`);
    });
  }

  // PHOTO (avatar/image)
  if (contact.avatar) {
    // Assume avatar is a URL or base64
    if (contact.avatar.startsWith('data:')) {
      lines.push(`PHOTO;ENCODING=BASE64;VALUE=URI:${contact.avatar}`);
    } else if (contact.avatar.startsWith('http')) {
      lines.push(`PHOTO;VALUE=URI:${contact.avatar}`);
    }
  }

  // CATEGORIES
  if (contact.categories && contact.categories.length > 0) {
    lines.push(`CATEGORIES:${contact.categories.join(',')}`);
  }

  lines.push('END:VCARD');
  return lines.join('\r\n');
}

/**
 * Convert multiple contacts to vCard format
 */
export function contactsToVCard(contacts: Contact[]): string {
  return contacts.map(contactToVCard).join('\r\n\r\n');
}

/**
 * Parse a vCard string into a Contact object
 */
export function vCardToContact(vCardText: string): Partial<Contact> {
  const lines = vCardText.split(/\r?\n/).filter(line => line.trim());
  const contact: Partial<Contact> = {
    emails: [],
    phones: [],
    addresses: [],
    categories: [],
  };

  for (const line of lines) {
    if (line.startsWith('BEGIN:') || line.startsWith('END:') || line.startsWith('VERSION:')) {
      continue;
    }

    // Parse property and value
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const propertyPart = line.substring(0, colonIndex);
    const value = line.substring(colonIndex + 1);

    // Parse property name and type parameters
    const parts = propertyPart.split(';');
    const propName = parts[0].toUpperCase();
    const params = parseVCardParams(parts.slice(1));

    switch (propName) {
      case 'UID':
        contact.uid = unescapeVCardValue(value);
        break;

      case 'FN':
        contact.name = unescapeVCardValue(value);
        break;

      case 'N': {
        const nameParts = value.split(';');
        if (nameParts[0]) contact.lastName = unescapeVCardValue(nameParts[0]);
        if (nameParts[1]) contact.firstName = unescapeVCardValue(nameParts[1]);
        break;
      }

      case 'EMAIL': {
        const emailType = (params['TYPE'] || 'other').toLowerCase();
        if (contact.emails) {
          contact.emails.push({
            type: emailType as 'home' | 'work' | 'other',
            email: unescapeVCardValue(value),
          });
        }
        break;
      }

      case 'TEL': {
        const phoneType = (params['TYPE'] || 'other').toLowerCase();
        if (contact.phones) {
          contact.phones.push({
            type: phoneType as 'home' | 'work' | 'mobile' | 'fax' | 'pager' | 'other',
            number: unescapeVCardValue(value),
          });
        }
        break;
      }

      case 'ORG':
        contact.organization = unescapeVCardValue(value);
        break;

      case 'TITLE':
        contact.jobTitle = unescapeVCardValue(value);
        break;

      case 'NOTE':
        contact.notes = unescapeVCardValue(value);
        break;

      case 'ADR': {
        const addressType = (params['TYPE'] || 'other').toLowerCase();
        const addrParts = value.split(';');
        if (contact.addresses) {
          contact.addresses.push({
            type: addressType as 'home' | 'work' | 'other',
            street: unescapeVCardValue(addrParts[2] || ''),
            city: unescapeVCardValue(addrParts[3] || ''),
            region: unescapeVCardValue(addrParts[4] || ''),
            postcode: unescapeVCardValue(addrParts[5] || ''),
            country: unescapeVCardValue(addrParts[6] || ''),
          });
        }
        break;
      }

      case 'PHOTO':
        if (value.startsWith('data:') || value.startsWith('http')) {
          contact.avatar = value;
        }
        break;

      case 'CATEGORIES': {
        const categories = value.split(',').map(cat => cat.trim()).filter(Boolean);
        if (contact.categories) {
          contact.categories = categories;
        }
        break;
      }
    }
  }

  return contact;
}

/**
 * Parse multiple vCard entries from a single text (multiple BEGIN:VCARD...END:VCARD blocks)
 */
export function parseVCards(text: string): Partial<Contact>[] {
  const contacts: Partial<Contact>[] = [];
  
  // Split by BEGIN:VCARD
  const vCardBlocks = text.split(/BEGIN:VCARD/i).slice(1);
  
  for (const block of vCardBlocks) {
    // Get content until END:VCARD
    const endIndex = block.toUpperCase().indexOf('END:VCARD');
    const vCardContent = `BEGIN:VCARD${block.substring(0, endIndex)}END:VCARD`;
    
    try {
      const contact = vCardToContact(vCardContent);
      if (contact.name || (contact.emails && contact.emails.length > 0)) {
        contacts.push(contact);
      }
    } catch (error) {
      console.error('Error parsing vCard:', error);
    }
  }
  
  return contacts;
}

/**
 * Helper function to escape special characters in vCard values
 */
function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n');
}

/**
 * Helper function to unescape special characters in vCard values
 */
function unescapeVCardValue(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\;/g, ';')
    .replace(/\\,/g, ',')
    .replace(/\\\\/g, '\\');
}

/**
 * Parse vCard property parameters
 */
function parseVCardParams(paramParts: string[]): Record<string, string> {
  const params: Record<string, string> = {};
  
  for (const part of paramParts) {
    const eqIndex = part.indexOf('=');
    if (eqIndex === -1) {
      params[part.toUpperCase()] = part;
    } else {
      const key = part.substring(0, eqIndex).toUpperCase();
      const value = part.substring(eqIndex + 1).toUpperCase();
      params[key] = value;
    }
  }
  
  return params;
}

/**
 * Export contacts as a .vcf file for download
 */
export function downloadVCard(contacts: Contact[], filename: string = 'contacts.vcf'): void {
  const vCardContent = contactsToVCard(contacts);
  const blob = new Blob([vCardContent], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
