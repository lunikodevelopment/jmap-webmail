/**
 * Email Filter Rules Types
 * Supports creating rules with conditions and actions for automatic email processing
 */

export type FilterConditionType = 'from' | 'to' | 'subject' | 'body' | 'hasAttachment';
export type FilterActionType = 'moveToMailbox' | 'markAsRead' | 'markAsSpam' | 'delete' | 'addLabel' | 'markAsImportant';

export interface FilterCondition {
  id: string;
  type: FilterConditionType;
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'is'; // 'is' for boolean conditions
  value: string;
}

export interface FilterAction {
  id: string;
  type: FilterActionType;
  value?: string; // mailboxId for moveToMailbox, label name for addLabel
}

export interface EmailFilter {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number; // Lower number = higher priority
  conditions: FilterCondition[];
  conditionMatch: 'all' | 'any'; // Match all conditions or any condition
  actions: FilterAction[];
  createdAt: number;
  updatedAt: number;
}

export interface FilterStats {
  totalRules: number;
  enabledRules: number;
  lastApplied?: number;
  appliedCount?: number;
}

/**
 * Check if an email matches a filter condition
 */
export function matchesCondition(email: any, condition: FilterCondition): boolean {
  const { type, operator, value } = condition;

  switch (type) {
    case 'from': {
      const fromEmail = email.from?.[0]?.email || '';
      return matchesOperator(fromEmail, value, operator);
    }

    case 'to': {
      const toEmails = (email.to || []).map((addr: any) => addr.email).join(' ');
      return matchesOperator(toEmails, value, operator);
    }

    case 'subject':
      return matchesOperator(email.subject || '', value, operator);

    case 'body': {
      const bodyText = email.textBody?.[0]?.value || email.htmlBody?.[0]?.value || '';
      return matchesOperator(bodyText, value, operator);
    }

    case 'hasAttachment':
      return (email.hasAttachment || false) === (value === 'true');

    default:
      return false;
  }
}

/**
 * Check if a value matches a condition operator
 */
function matchesOperator(
  value: string,
  pattern: string,
  operator: FilterCondition['operator']
): boolean {
  const lowerValue = value.toLowerCase();
  const lowerPattern = pattern.toLowerCase();

  switch (operator) {
    case 'contains':
      return lowerValue.includes(lowerPattern);

    case 'equals':
      return lowerValue === lowerPattern;

    case 'startsWith':
      return lowerValue.startsWith(lowerPattern);

    case 'endsWith':
      return lowerValue.endsWith(lowerPattern);

    case 'is':
      return value === pattern;

    default:
      return false;
  }
}

/**
 * Check if an email matches all conditions of a filter
 */
export function matchesFilter(email: any, filter: EmailFilter): boolean {
  if (!filter.enabled || filter.conditions.length === 0) {
    return false;
  }

  const matches = filter.conditions.map((condition) =>
    matchesCondition(email, condition)
  );

  if (filter.conditionMatch === 'all') {
    return matches.every((m) => m === true);
  } else {
    return matches.some((m) => m === true);
  }
}

/**
 * Generate a unique ID
 */
export function generateFilterId(): string {
  return `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
