/**
 * Email Template Types
 * Support for reusable email templates with variable substitution
 */

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category?: string;
  description?: string;
  isSignature?: boolean; // Special flag for signature templates
  variables?: string[]; // List of variables used (e.g., ['recipient_name', 'date'])
  createdAt: number;
  updatedAt: number;
}

export interface TemplateVariable {
  name: string;
  label: string;
  placeholder: string;
  value?: string;
  isRequired?: boolean;
}

// Common template variables
export const COMMON_VARIABLES: Record<string, TemplateVariable> = {
  recipient_name: {
    name: 'recipient_name',
    label: 'Recipient Name',
    placeholder: '{{recipient_name}}',
  },
  recipient_email: {
    name: 'recipient_email',
    label: 'Recipient Email',
    placeholder: '{{recipient_email}}',
  },
  sender_name: {
    name: 'sender_name',
    label: 'Sender Name',
    placeholder: '{{sender_name}}',
  },
  current_date: {
    name: 'current_date',
    label: 'Current Date',
    placeholder: '{{current_date}}',
  },
  current_time: {
    name: 'current_time',
    label: 'Current Time',
    placeholder: '{{current_time}}',
  },
  company_name: {
    name: 'company_name',
    label: 'Company Name',
    placeholder: '{{company_name}}',
  },
  signature: {
    name: 'signature',
    label: 'Signature',
    placeholder: '{{signature}}',
  },
};

/**
 * Extract variables from template text
 */
export function extractVariables(text: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const variables: string[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }

  return variables;
}

/**
 * Replace variables in template with provided values
 */
export function substituteVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  });

  return result;
}

/**
 * Generate a unique template ID
 */
export function generateTemplateId(): string {
  return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
