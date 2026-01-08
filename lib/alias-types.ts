/**
 * Email Aliases Types and Interfaces
 * Comprehensive type definitions for email alias management functionality
 */

/**
 * Alias visibility mode for recipient display
 * - 'primary': Show primary email address to recipients
 * - 'alias': Show alias email address to recipients
 * - 'masked': Hide email address, show display name only
 */
export type AliasVisibility = 'primary' | 'alias' | 'masked';

/**
 * Alias status
 * - 'active': Alias is enabled and can receive/send emails
 * - 'inactive': Alias is disabled but configuration is preserved
 * - 'archived': Alias is archived and cannot be used
 */
export type AliasStatus = 'active' | 'inactive' | 'archived';

/**
 * Forwarding rule action type
 */
export type ForwardingAction = 'forward' | 'copy' | 'redirect' | 'discard';

/**
 * Forwarding rule condition type
 */
export type ForwardingCondition = 'from' | 'to' | 'subject' | 'body' | 'all';

/**
 * Alias forwarding rule
 * Defines how emails received on an alias should be handled
 */
export interface AliasForwardingRule {
  id: string;
  aliasId: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  
  // Conditions
  conditions: {
    type: ForwardingCondition;
    operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'regex';
    value: string;
  }[];
  conditionMatch: 'all' | 'any'; // AND or OR logic
  
  // Actions
  action: ForwardingAction;
  forwardTo?: string[]; // Email addresses to forward to
  copyTo?: string[]; // Email addresses to copy to
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}

/**
 * Alias usage statistics
 * Tracks how an alias is being used
 */
export interface AliasUsageStats {
  aliasId: string;
  emailsSent: number;
  emailsReceived: number;
  lastUsedAt?: string; // ISO 8601 timestamp
  createdAt: number;
  updatedAt: number;
}

/**
 * Alias policy for organizational enforcement
 */
export interface AliasPolicy {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  
  // Naming conventions
  namingPattern?: string; // Regex pattern for alias names
  namingPrefix?: string; // Required prefix for aliases
  namingTemplate?: string; // Template like {firstname}.{lastname}@domain
  
  // Restrictions
  maxAliasesPerUser?: number; // Maximum aliases a user can create
  allowedDomains?: string[]; // Domains users can create aliases for
  blockedDomains?: string[]; // Domains users cannot use
  
  // Forwarding restrictions
  maxForwardingRules?: number; // Max rules per alias
  allowExternalForwarding?: boolean; // Can forward to external addresses
  
  // Visibility
  defaultVisibility?: AliasVisibility;
  allowVisibilityChange?: boolean;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}

/**
 * Main Email Alias interface
 * Represents a single email alias associated with an account
 */
export interface EmailAlias {
  id: string;
  accountId: string;
  
  // Basic information
  email: string; // The alias email address (e.g., support@example.com)
  displayName?: string; // Display name for the alias
  description?: string; // User-friendly description
  
  // Status and activation
  status: AliasStatus;
  isDefault?: boolean; // Whether this is the default alias for sending
  
  // Visibility and recipient controls
  visibility: AliasVisibility;
  maskPrimaryEmail?: boolean; // Hide primary email from recipients
  
  // Forwarding configuration
  forwardingRules: AliasForwardingRule[];
  autoForwardTo?: string[]; // Default forwarding addresses
  
  // Capabilities
  canSend: boolean; // Can send emails from this alias
  canReceive: boolean; // Can receive emails on this alias
  
  // Naming and organization
  category?: string; // Category/tag for organization (e.g., 'work', 'personal', 'support')
  tags?: string[]; // Additional tags for filtering
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: string; // ISO 8601 timestamp
  
  // Usage statistics
  stats?: AliasUsageStats;
}

/**
 * Alias creation request
 */
export interface CreateAliasRequest {
  email: string;
  displayName?: string;
  description?: string;
  visibility?: AliasVisibility;
  canSend?: boolean;
  canReceive?: boolean;
  category?: string;
  tags?: string[];
}

/**
 * Alias update request
 */
export interface UpdateAliasRequest {
  displayName?: string;
  description?: string;
  status?: AliasStatus;
  visibility?: AliasVisibility;
  maskPrimaryEmail?: boolean;
  canSend?: boolean;
  canReceive?: boolean;
  category?: string;
  tags?: string[];
  isDefault?: boolean;
}

/**
 * Alias batch operation request
 */
export interface AliasBatchOperation {
  aliasIds: string[];
  operation: 'activate' | 'deactivate' | 'archive' | 'delete';
  reason?: string;
}

/**
 * Admin audit log entry for alias operations
 */
export interface AliasAuditLog {
  id: string;
  timestamp: number;
  userId: string;
  action: 'create' | 'update' | 'delete' | 'activate' | 'deactivate' | 'archive';
  aliasId: string;
  aliasEmail: string;
  changes?: Record<string, { before: unknown; after: unknown }>;
  reason?: string;
  ipAddress?: string;
}

/**
 * Admin dashboard statistics
 */
export interface AliasAdminStats {
  totalAliases: number;
  activeAliases: number;
  inactiveAliases: number;
  archivedAliases: number;
  totalUsers: number;
  usersWithAliases: number;
  averageAliasesPerUser: number;
  totalForwardingRules: number;
  policyViolations: number;
  lastUpdated: number;
}

/**
 * Helper function to generate alias ID
 */
export function generateAliasId(): string {
  return `alias_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Helper function to validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Helper function to validate alias naming pattern
 */
export function validateAliasName(
  email: string,
  pattern?: string,
  prefix?: string
): boolean {
  if (!isValidEmail(email)) {
    return false;
  }

  if (prefix && !email.startsWith(prefix)) {
    return false;
  }

  if (pattern) {
    try {
      const regex = new RegExp(pattern);
      return regex.test(email);
    } catch {
      return false;
    }
  }

  return true;
}

/**
 * Helper function to extract local part from email
 */
export function getEmailLocalPart(email: string): string {
  return email.split('@')[0] || '';
}

/**
 * Helper function to extract domain from email
 */
export function getEmailDomain(email: string): string {
  return email.split('@')[1] || '';
}
