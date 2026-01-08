/**
 * Email Signature Types
 * Support for managing email signatures per identity
 */

export interface EmailSignature {
  id: string;
  identityId: string; // Associated identity/email account
  name: string;
  content: string; // HTML or plain text signature
  isDefault: boolean; // Whether this is the default signature for the identity
  isHtml: boolean; // Whether the signature contains HTML
  createdAt: number;
  updatedAt: number;
}

export interface SignatureSettings {
  autoAppendSignature: boolean; // Automatically append signature to new emails
  autoAppendToReplies: boolean; // Automatically append signature to replies
  autoAppendToForwards: boolean; // Automatically append signature to forwards
  separatorStyle: 'none' | 'dashes' | 'line'; // Signature separator style
}

/**
 * Generate a unique signature ID
 */
export function generateSignatureId(): string {
  return `signature_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format signature with separator
 */
export function formatSignatureWithSeparator(
  signature: string,
  separatorStyle: 'none' | 'dashes' | 'line'
): string {
  if (separatorStyle === 'none') {
    return signature;
  }

  const separator = separatorStyle === 'dashes' ? '-- ' : '_______________';
  return `\n\n${separator}\n${signature}`;
}

/**
 * Strip HTML tags from signature (for plain text display)
 */
export function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

/**
 * Validate signature content
 */
export function isValidSignature(content: string): boolean {
  return content.trim().length > 0 && content.trim().length <= 5000;
}
