# Advanced Features Implementation Guide

This document provides an overview of all the advanced features implemented in JMAP Webmail.

## Table of Contents

1. [Advanced Search with Filters](#advanced-search-with-filters)
2. [Email Scheduling](#email-scheduling)
3. [Email Tracking](#email-tracking)
4. [Email Forwarding](#email-forwarding)
5. [Multiple Accounts Login](#multiple-accounts-login)
6. [Remember Me Function](#remember-me-function)
7. [Favicon Fetching](#favicon-fetching)
8. [Service Workers for PWA](#service-workers-for-pwa)
9. [Email Encryption (PGP/GPG)](#email-encryption-pgpgpg)
10. [Calendar Invites](#calendar-invites)

---

## Advanced Search with Filters

### Overview
Advanced search allows users to search emails using multiple filters with complex conditions.

### Files
- **Types**: [`lib/advanced-search-types.ts`](../lib/advanced-search-types.ts)
- **Store**: [`stores/advanced-search-store.ts`](../stores/advanced-search-store.ts)
- **Component**: [`components/email/advanced-search.tsx`](../components/email/advanced-search.tsx)

### Features
- Multiple filter conditions (from, to, subject, body, date, size, attachments, read status, starred, labels)
- Operators: contains, equals, starts_with, ends_with, greater_than, less_than, between
- Match ALL or ANY conditions
- Save and load search queries
- Search result caching

### Usage
```typescript
import { useAdvancedSearchStore } from '@/stores/advanced-search-store';

const { addFilter, removeFilter, setMatchAll } = useAdvancedSearchStore();

// Add a filter
addFilter({
  id: 'filter-1',
  field: 'subject',
  operator: 'contains',
  value: 'important',
  caseSensitive: false
});
```

---

## Email Scheduling

### Overview
Schedule emails to be sent at a later time with support for recurring schedules.

### Files
- **Types**: [`lib/email-scheduling-types.ts`](../lib/email-scheduling-types.ts)
- **Store**: [`stores/email-scheduling-store.ts`](../stores/email-scheduling-store.ts)

### Features
- Schedule emails for specific date/time
- Recurring schedules (daily, weekly, monthly, yearly)
- Timezone support
- Automatic reminders before sending
- Retry mechanism for failed sends
- Cancel or reschedule emails

### Usage
```typescript
import { useEmailSchedulingStore } from '@/stores/email-scheduling-store';

const { scheduleEmail } = useEmailSchedulingStore();

scheduleEmail({
  id: 'scheduled-1',
  draftId: 'draft-123',
  to: ['recipient@example.com'],
  subject: 'Hello',
  body: 'This is a scheduled email',
  schedule: {
    id: 'schedule-1',
    emailId: 'email-123',
    scheduledTime: new Date('2026-01-15T10:00:00'),
    frequency: 'once',
    timezone: 'Europe/Amsterdam',
    status: 'scheduled',
    createdAt: new Date(),
    updatedAt: new Date(),
    retryCount: 0,
    maxRetries: 3
  }
});
```

---

## Email Tracking

### Overview
Track email opens, clicks, and delivery status with detailed analytics.

### Files
- **Types**: [`lib/email-tracking-types.ts`](../lib/email-tracking-types.ts)
- **Store**: [`stores/email-tracking-store.ts`](../stores/email-tracking-store.ts)

### Features
- Track email opens with timestamp and location
- Track link clicks with URL information
- Delivery status monitoring
- Open rate, click rate, and delivery rate calculations
- Configurable tracking settings
- Data retention policies

### Usage
```typescript
import { useEmailTrackingStore } from '@/stores/email-tracking-store';

const { addTrackingData, recordTrackingEvent, getOpenRate } = useEmailTrackingStore();

// Record a tracking event
recordTrackingEvent('email-123', {
  id: 'event-1',
  emailId: 'email-123',
  trackingId: 'track-123',
  eventType: 'opened',
  timestamp: new Date(),
  userAgent: 'Mozilla/5.0...',
  ipAddress: '192.168.1.1'
});

// Get open rate
const rate = getOpenRate(['email-123', 'email-124']);
```

---

## Email Forwarding

### Overview
Forward emails to external addresses, other accounts, or based on conditional rules.

### Files
- **Types**: [`lib/email-forwarding-types.ts`](../lib/email-forwarding-types.ts)
- **Store**: [`stores/email-forwarding-store.ts`](../stores/email-forwarding-store.ts)

### Features
- **External Forwarding**: Forward to external email addresses
- **Account Forwarding**: Forward to other email accounts
- **Conditional Rules**: Forward based on sender, subject, content, or attachments
- Keep copy in original mailbox
- Forwarding statistics and failure tracking
- Priority-based rule execution

### Usage
```typescript
import { useEmailForwardingStore } from '@/stores/email-forwarding-store';

const { addExternalForwarding, addConditionalRule } = useEmailForwardingStore();

// Add external forwarding
addExternalForwarding({
  id: 'forward-1',
  sourceEmail: 'user@example.com',
  forwardToEmail: 'backup@example.com',
  enabled: true,
  keepCopy: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Add conditional rule
addConditionalRule({
  id: 'rule-1',
  sourceEmail: 'user@example.com',
  name: 'Forward newsletters',
  conditions: [{
    id: 'cond-1',
    type: 'subject',
    operator: 'contains',
    value: 'newsletter'
  }],
  actions: [{
    id: 'action-1',
    type: 'forward_to_external',
    targetEmail: 'newsletters@example.com'
  }],
  enabled: true,
  priority: 1,
  createdAt: new Date(),
  updatedAt: new Date()
});
```

---

## Multiple Accounts Login

### Overview
Manage and switch between multiple email accounts seamlessly.

### Files
- **Types**: [`lib/multi-account-types.ts`](../lib/multi-account-types.ts)
- **Store**: [`stores/multi-account-store.ts`](../stores/multi-account-store.ts)

### Features
- Add and manage multiple accounts
- Switch between accounts
- Per-account settings and profiles
- Session management
- Account switch history
- Primary account designation

### Usage
```typescript
import { useMultiAccountStore } from '@/stores/multi-account-store';

const { addAccount, setCurrentAccount, getCurrentAccount } = useMultiAccountStore();

// Add account
addAccount({
  id: 'account-1',
  email: 'user@example.com',
  displayName: 'My Account',
  jmapServer: 'https://jmap.example.com',
  accessToken: 'token-123',
  isPrimary: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Switch account
setCurrentAccount('account-1');

// Get current account
const current = getCurrentAccount();
```

---

## Remember Me Function

### Overview
Allow users to stay logged in on trusted devices with secure token management.

### Files
- **Types**: [`lib/remember-me-types.ts`](../lib/remember-me-types.ts)
- **Store**: [`stores/remember-me-store.ts`](../stores/remember-me-store.ts)

### Features
- Persistent login tokens with expiration
- Device management and tracking
- Token validation and revocation
- Device-specific settings
- Configurable token expiration
- Email notifications for new devices

### Usage
```typescript
import { useRememberMeStore } from '@/stores/remember-me-store';

const { createToken, validateToken, registerDevice } = useRememberMeStore();

// Create remember me token
createToken({
  id: 'token-1',
  email: 'user@example.com',
  token: 'secure-token-123',
  hashedToken: 'hashed-token-123',
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  isActive: true
});

// Validate token
const isValid = validateToken('user@example.com', 'secure-token-123');

// Register device
registerDevice({
  id: 'device-1',
  email: 'user@example.com',
  deviceName: 'My Laptop',
  deviceType: 'desktop',
  osName: 'Linux',
  browserName: 'Firefox',
  lastUsedAt: new Date(),
  createdAt: new Date(),
  isCurrentDevice: true
});
```

---

## Favicon Fetching

### Overview
Automatically fetch and cache favicons for email domains.

### Files
- **Utilities**: [`lib/favicon-utils.ts`](../lib/favicon-utils.ts)

### Features
- Fetch favicons from multiple services with fallback
- Automatic caching with 7-day expiration
- Batch favicon fetching
- Cache management and cleanup
- Default fallback icon

### Usage
```typescript
import { fetchFaviconForEmail, fetchFaviconsForEmails } from '@/lib/favicon-utils';

// Fetch single favicon
const favicon = await fetchFaviconForEmail('user@example.com');

// Batch fetch
const favicons = await fetchFaviconsForEmails([
  'user1@example.com',
  'user2@example.com'
]);

// Get cache stats
import { getFaviconCacheStats } from '@/lib/favicon-utils';
const stats = getFaviconCacheStats();
```

---

## Service Workers for PWA

### Overview
Progressive Web App support with offline functionality and background sync.

### Files
- **Service Worker**: [`public/service-worker.js`](../public/service-worker.js)
- **Hook**: [`hooks/use-service-worker.ts`](../hooks/use-service-worker.ts)

### Features
- Offline support with cache-first strategy
- Background sync for emails and drafts
- Push notifications
- Automatic cache updates
- Network status detection
- Service worker update management

### Usage
```typescript
import { useServiceWorker } from '@/hooks/use-service-worker';

export function MyComponent() {
  const {
    isSupported,
    isOnline,
    updateAvailable,
    updateServiceWorker,
    requestBackgroundSync,
    requestNotificationPermission
  } = useServiceWorker();

  // Request background sync
  const syncEmails = async () => {
    await requestBackgroundSync('sync-emails');
  };

  // Request notification permission
  const enableNotifications = async () => {
    const granted = await requestNotificationPermission();
  };

  return (
    <div>
      {updateAvailable && (
        <button onClick={updateServiceWorker}>Update Available</button>
      )}
    </div>
  );
}
```

---

## Email Encryption (PGP/GPG)

### Overview
Encrypt and sign emails using PGP/GPG with key management.

### Files
- **Types**: [`lib/email-encryption-types.ts`](../lib/email-encryption-types.ts)
- **Store**: [`stores/email-encryption-store.ts`](../stores/email-encryption-store.ts)

### Features
- PGP/GPG key management (import, export, generate)
- Email encryption and decryption
- Email signing and verification
- Trusted recipient management
- Auto-encryption for trusted recipients
- Auto-signing of emails
- Multiple encryption methods (PGP, GPG, S/MIME)

### Usage
```typescript
import { useEmailEncryptionStore } from '@/stores/email-encryption-store';

const {
  addKey,
  getPrivateKeys,
  setDefaultPrivateKey,
  addTrustedRecipient,
  updateSettings
} = useEmailEncryptionStore();

// Add encryption key
addKey({
  id: 'key-1',
  keyId: 'ABCD1234',
  fingerprint: 'ABCD1234EFGH5678',
  type: 'private',
  algorithm: 'RSA',
  keySize: 4096,
  email: 'user@example.com',
  createdAt: new Date(),
  isDefault: true,
  publicKeyArmored: '-----BEGIN PGP PUBLIC KEY BLOCK-----...',
  privateKeyArmored: '-----BEGIN PGP PRIVATE KEY BLOCK-----...'
});

// Set default key
setDefaultPrivateKey('key-1');

// Add trusted recipient
addTrustedRecipient('trusted@example.com');

// Update settings
updateSettings({
  enableEncryption: true,
  autoSignEmails: true,
  autoEncryptToTrustedRecipients: true
});
```

---

## Calendar Invites

### Overview
Handle calendar invitations with RSVP and integration with email.

### Files
- **Types**: [`lib/calendar-invite-types.ts`](../lib/calendar-invite-types.ts)
- **Store**: [`stores/calendar-invite-store.ts`](../stores/calendar-invite-store.ts)

### Features
- Parse and display calendar invitations
- RSVP management (accept, decline, tentative)
- Attendee tracking
- Recurring event support
- Automatic calendar integration
- Invitation notifications
- Reminder management

### Usage
```typescript
import { useCalendarInviteStore } from '@/stores/calendar-invite-store';

const {
  addInvite,
  respondToInvite,
  getPendingInvites,
  getUpcomingInvites
} = useCalendarInviteStore();

// Add calendar invite
addInvite({
  id: 'invite-1',
  emailId: 'email-123',
  eventId: 'event-123',
  eventTitle: 'Team Meeting',
  organizer: {
    name: 'John Doe',
    email: 'john@example.com'
  },
  attendees: [{
    id: 'attendee-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    status: 'pending',
    role: 'attendee'
  }],
  startTime: new Date('2026-01-15T10:00:00'),
  endTime: new Date('2026-01-15T11:00:00'),
  status: 'pending',
  role: 'attendee',
  createdAt: new Date(),
  updatedAt: new Date()
});

// Respond to invite
respondToInvite('invite-1', {
  id: 'response-1',
  inviteId: 'invite-1',
  status: 'accepted',
  comment: 'Looking forward to it!',
  respondedAt: new Date(),
  sendNotification: true
});

// Get pending invites
const pending = getPendingInvites();

// Get upcoming invites
const upcoming = getUpcomingInvites(7); // Next 7 days
```

---

## Integration with Settings

All advanced features are integrated with the settings system. Users can configure:

- **Advanced Search**: Save and manage search queries
- **Email Scheduling**: Configure default timezone and reminder times
- **Email Tracking**: Enable/disable tracking, set retention policies
- **Email Forwarding**: Manage forwarding rules and statistics
- **Multiple Accounts**: Switch between accounts, set primary account
- **Remember Me**: Configure token expiration and device management
- **Email Encryption**: Manage keys and encryption preferences
- **Calendar Invites**: Configure auto-accept and reminder settings

---

## Localization

All advanced features include full localization support. Translations are available in:
- English: [`locales/en/common.json`](../locales/en/common.json)
- French: [`locales/fr/common.json`](../locales/fr/common.json)

---

## Performance Considerations

- **Caching**: Favicons and search results are cached to reduce server load
- **Lazy Loading**: Advanced features are loaded on-demand
- **Background Sync**: Email operations are synced in the background
- **Offline Support**: Service workers enable offline functionality
- **Data Retention**: Configurable retention policies for tracking data

---

## Security Considerations

- **Encryption**: PGP/GPG support for end-to-end encryption
- **Token Management**: Secure token generation and validation for remember me
- **Device Tracking**: Device fingerprinting and management
- **Trusted Recipients**: Whitelist for auto-encryption
- **Data Privacy**: Configurable data retention and cleanup

---

## Future Enhancements

- Integration with external calendar services (Google Calendar, Outlook)
- Advanced AI-powered search suggestions
- Machine learning for email categorization
- Blockchain-based email verification
- Advanced analytics dashboard
- Email template marketplace
- Integration with third-party services (Slack, Teams, etc.)

---

## Support and Documentation

For more information on specific features, refer to:
- [Email Aliases Documentation](./EMAIL_ALIASES.md)
- [JMAP Client Documentation](../lib/jmap/client.ts)
- [Store Documentation](../stores/)
- [Component Documentation](../components/)

---

**Last Updated**: January 8, 2026
**Version**: 1.0.0
