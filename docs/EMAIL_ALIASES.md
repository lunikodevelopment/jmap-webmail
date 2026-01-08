# Email Aliases Feature Documentation

## Overview

The Email Aliases feature enables users to create, manage, and utilize multiple email addresses associated with a single account. This comprehensive system includes alias creation, selective activation/deactivation, forwarding rules, recipient visibility controls, and administrative tools for policy enforcement.

## Features

### 1. Alias Management

#### Creating Aliases
- Users can create multiple email aliases for their account
- Each alias can have:
  - Email address (required)
  - Display name (optional)
  - Description (optional)
  - Category/tags for organization
  - Visibility settings for recipients

#### Alias Status
- **Active**: Alias is enabled and can send/receive emails
- **Inactive**: Alias is disabled but configuration is preserved
- **Archived**: Alias is archived and cannot be used

#### Alias Operations
- Create new aliases
- Update alias properties
- Activate/deactivate aliases
- Archive aliases
- Delete aliases
- Batch operations on multiple aliases

### 2. Forwarding Rules

Each alias can have multiple forwarding rules that automatically handle incoming emails:

#### Rule Components
- **Name**: Descriptive name for the rule
- **Conditions**: Filter emails based on:
  - From address
  - To address
  - Subject line
  - Body content
  - Condition matching: ALL (AND) or ANY (OR)

#### Rule Actions
- **Forward**: Send emails to specified addresses
- **Copy**: Send copies to specified addresses
- **Redirect**: Redirect emails to specified addresses
- **Discard**: Delete emails matching the rule

#### Rule Management
- Create forwarding rules per alias
- Enable/disable rules without deleting
- Edit rule conditions and actions
- Delete rules
- Priority-based rule ordering

### 3. Recipient Visibility Controls

Control how email addresses appear to recipients:

#### Visibility Modes
- **Primary**: Show the primary email address
- **Alias**: Show the alias email address
- **Masked**: Hide email address, show display name only

#### Benefits
- Privacy protection
- Professional appearance
- Flexible sender identification
- Compliance with organizational policies

### 4. Usage Statistics

Track alias usage with detailed analytics:

- **Emails Sent**: Count of emails sent from the alias
- **Emails Received**: Count of emails received on the alias
- **Last Used**: Timestamp of last activity
- **Creation Date**: When the alias was created

### 5. Administrative Tools

#### Policy Management
Create and enforce organizational policies:

- **Naming Conventions**: Regex patterns for alias names
- **Naming Prefix**: Required prefix for all aliases
- **Naming Template**: Template-based alias generation
- **Maximum Aliases**: Limit aliases per user
- **Allowed Domains**: Whitelist domains for aliases
- **Blocked Domains**: Blacklist domains
- **Forwarding Restrictions**: Control external forwarding
- **Visibility Defaults**: Set default visibility mode

#### Audit Logging
Track all alias operations:

- User actions (create, update, delete, activate, deactivate)
- Timestamp of each action
- User information
- Changes made
- Reason for action
- IP address (optional)

#### Statistics Dashboard
Monitor system-wide alias usage:

- Total aliases count
- Active/inactive/archived breakdown
- User statistics
- Forwarding rules count
- Policy violation tracking
- Last update timestamp

#### Import/Export
- Export aliases to JSON format
- Import aliases from JSON
- Backup and restore functionality

## Architecture

### Type Definitions (`lib/alias-types.ts`)

```typescript
// Main alias interface
interface EmailAlias {
  id: string;
  accountId: string;
  email: string;
  displayName?: string;
  description?: string;
  status: AliasStatus;
  visibility: AliasVisibility;
  forwardingRules: AliasForwardingRule[];
  canSend: boolean;
  canReceive: boolean;
  category?: string;
  tags?: string[];
  stats?: AliasUsageStats;
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: string;
}

// Forwarding rule interface
interface AliasForwardingRule {
  id: string;
  aliasId: string;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: ForwardingCondition[];
  conditionMatch: 'all' | 'any';
  action: ForwardingAction;
  forwardTo?: string[];
  createdAt: number;
  updatedAt: number;
}

// Policy interface
interface AliasPolicy {
  id: string;
  name: string;
  enabled: boolean;
  namingPattern?: string;
  maxAliasesPerUser?: number;
  allowedDomains?: string[];
  allowExternalForwarding?: boolean;
  defaultVisibility?: AliasVisibility;
  createdAt: number;
  updatedAt: number;
}
```

### State Management (`stores/alias-store.ts`)

Zustand-based store with:
- Alias CRUD operations
- Forwarding rule management
- Usage statistics tracking
- Policy management
- Audit logging
- Admin statistics
- Import/export functionality

### JMAP Client Integration (`lib/jmap/client.ts`)

Methods for server-side operations:
- `getAliases()`: Fetch all aliases
- `createAlias()`: Create new alias
- `updateAlias()`: Update alias properties
- `deleteAlias()`: Delete alias
- `setAliasForwarding()`: Configure forwarding
- `getAliasUsageStats()`: Fetch usage statistics
- `validateAliasEmail()`: Validate email format
- `getAliasCapabilities()`: Check server support

### UI Components

#### Email Aliases Settings (`components/settings/email-aliases-settings.tsx`)
- Main settings interface
- Alias list display
- Create/edit/delete operations
- Status management
- Visibility controls

#### Alias Management Modal (`components/settings/alias-management-modal.tsx`)
- Detailed alias configuration
- Forwarding rule management
- Usage statistics display
- Three tabs: General, Forwarding, Stats

#### Admin Tools (`components/settings/alias-admin-tools.tsx`)
- Policy management
- Audit log viewing
- Statistics dashboard
- Import/export functionality

## Usage Examples

### Creating an Alias

```typescript
const { createAlias } = useAliasStore();

createAlias({
  email: 'support@example.com',
  displayName: 'Support Team',
  description: 'Support email alias',
  visibility: 'alias',
  category: 'support',
  canSend: true,
  canReceive: true,
});
```

### Adding a Forwarding Rule

```typescript
const { addForwardingRule } = useAliasStore();

addForwardingRule(aliasId, {
  name: 'Forward to support team',
  enabled: true,
  priority: 0,
  conditions: [
    {
      type: 'from',
      operator: 'contains',
      value: '@customer.com',
    },
  ],
  conditionMatch: 'all',
  action: 'forward',
  forwardTo: ['support1@example.com', 'support2@example.com'],
});
```

### Managing Visibility

```typescript
const { setAliasVisibility } = useAliasStore();

// Cycle through visibility modes
setAliasVisibility(aliasId, 'masked');
```

### Creating a Policy

```typescript
const { createPolicy } = useAliasStore();

createPolicy({
  name: 'Standard User Policy',
  enabled: true,
  maxAliasesPerUser: 5,
  allowedDomains: ['example.com'],
  allowExternalForwarding: false,
  defaultVisibility: 'alias',
});
```

## Integration with Email System

### Sending Emails
When composing an email, users can select which alias to send from:
- The "From" field shows available aliases
- Selected alias determines sender visibility
- Forwarding rules don't affect outgoing emails

### Receiving Emails
Incoming emails to an alias:
- Trigger forwarding rules if configured
- Update usage statistics
- Appear in the inbox with alias information
- Can be filtered by alias

### Email Composer Integration
```typescript
// In email composer, select alias
const selectedAlias = aliases.find(a => a.id === selectedAliasId);
const fromEmail = selectedAlias?.email || primaryEmail;
```

## Security Considerations

### Privacy
- Masked visibility prevents email address disclosure
- Forwarding rules can redirect sensitive emails
- Audit logs track all operations

### Access Control
- Only account owner can manage their aliases
- Policies enforce organizational rules
- Admin tools require elevated permissions

### Data Protection
- Aliases stored securely in user's account
- Forwarding rules validated before execution
- Audit logs retained for compliance

## Performance Optimization

### Caching
- Aliases cached in Zustand store
- Forwarding rules loaded with alias
- Statistics updated on demand

### Batch Operations
- Batch update multiple aliases
- Batch delete with confirmation
- Efficient rule processing

### Pagination
- Audit logs paginated (50 per page)
- Alias list scrollable with max-height
- Statistics computed on demand

## Localization

Strings available in `locales/en/common.json`:
- `email_aliases`: Main alias settings
- `alias_management`: Modal content
- `alias_admin`: Admin tools

Supports multiple languages through next-intl framework.

## Future Enhancements

### Planned Features
1. **Alias Groups**: Group related aliases
2. **Smart Forwarding**: ML-based rule suggestions
3. **Alias Analytics**: Advanced usage reports
4. **Scheduled Aliases**: Temporary aliases with expiration
5. **Alias Sharing**: Share aliases with team members
6. **Custom Domains**: Support for custom domain aliases
7. **Webhook Integration**: Forward to webhooks
8. **Rate Limiting**: Control forwarding frequency

### Server-Side Features
1. **Server-side Forwarding**: Process rules on server
2. **Sieve Integration**: Use Sieve for advanced rules
3. **LDAP Sync**: Sync aliases with LDAP
4. **Database Persistence**: Store aliases in database
5. **Replication**: Replicate aliases across servers

## Troubleshooting

### Aliases Not Appearing
- Check if server supports alias functionality
- Verify JMAP capabilities
- Check browser console for errors

### Forwarding Rules Not Working
- Verify rule conditions are correct
- Check if alias is active
- Review audit logs for errors

### Statistics Not Updating
- Ensure emails are being sent/received
- Check if statistics tracking is enabled
- Verify alias is active

## API Reference

### Store Methods

#### Alias Operations
- `createAlias(request)`: Create new alias
- `updateAlias(aliasId, updates)`: Update alias
- `deleteAlias(aliasId)`: Delete alias
- `getAliasById(aliasId)`: Get alias by ID
- `getAliasByEmail(email)`: Get alias by email
- `getActiveAliases()`: Get all active aliases
- `getAliasesByCategory(category)`: Filter by category
- `getAliasesByTag(tag)`: Filter by tag

#### Status Operations
- `activateAlias(aliasId)`: Activate alias
- `deactivateAlias(aliasId)`: Deactivate alias
- `archiveAlias(aliasId)`: Archive alias
- `setDefaultAlias(aliasId)`: Set as default

#### Forwarding Rules
- `addForwardingRule(aliasId, rule)`: Add rule
- `updateForwardingRule(aliasId, ruleId, updates)`: Update rule
- `deleteForwardingRule(aliasId, ruleId)`: Delete rule
- `getForwardingRules(aliasId)`: Get all rules
- `toggleForwardingRule(aliasId, ruleId)`: Toggle rule

#### Statistics
- `updateAliasStats(aliasId, stats)`: Update stats
- `recordEmailSent(aliasId)`: Record sent email
- `recordEmailReceived(aliasId)`: Record received email
- `getAliasStats(aliasId)`: Get stats

#### Policies
- `createPolicy(policy)`: Create policy
- `updatePolicy(policyId, updates)`: Update policy
- `deletePolicy(policyId)`: Delete policy
- `getPolicyById(policyId)`: Get policy
- `getActivePolicies()`: Get active policies

#### Audit & Admin
- `addAuditLog(log)`: Add audit entry
- `getAuditLogs(aliasId?, limit?)`: Get logs
- `clearAuditLogs(olderThanDays?)`: Clear old logs
- `updateAdminStats(stats)`: Update statistics
- `getAdminStats()`: Get statistics
- `exportAliases()`: Export to JSON
- `importAliases(aliases)`: Import from JSON

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review audit logs for errors
3. Check browser console for JavaScript errors
4. Contact system administrator

## License

This feature is part of the JMAP Webmail project and is licensed under the MIT License.
