/**
 * Email Forwarding Types
 * Defines types for forwarding emails to external addresses and other accounts
 */

export type ForwardingType = 'external' | 'account' | 'conditional';

export interface ExternalForwarding {
  id: string;
  sourceEmail: string;
  forwardToEmail: string;
  enabled: boolean;
  keepCopy: boolean; // Keep a copy in the original mailbox
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountForwarding {
  id: string;
  sourceEmail: string;
  targetAccountId: string;
  targetEmail: string;
  enabled: boolean;
  keepCopy: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConditionalForwardingRule {
  id: string;
  sourceEmail: string;
  name: string;
  description?: string;
  conditions: ForwardingCondition[];
  actions: ForwardingAction[];
  enabled: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ForwardingCondition {
  id: string;
  type: 'from' | 'to' | 'subject' | 'body' | 'has_attachment' | 'size';
  operator: 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than';
  value: string | number;
}

export interface ForwardingAction {
  id: string;
  type: 'forward_to_external' | 'forward_to_account' | 'label' | 'mark_read' | 'delete';
  targetEmail?: string;
  targetAccountId?: string;
  label?: string;
}

export interface ForwardingStatistics {
  id: string;
  forwardingId: string;
  forwardingType: ForwardingType;
  emailsForwarded: number;
  lastForwardedAt?: Date;
  failureCount: number;
  lastFailureAt?: Date;
  lastFailureReason?: string;
}
