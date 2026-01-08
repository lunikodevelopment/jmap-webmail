export interface EmailHeader {
  name: string;
  value: string;
}

export interface Email {
  id: string;
  threadId: string;
  mailboxIds: Record<string, boolean>;
  keywords: Record<string, boolean>;
  size: number;
  receivedAt: string;
  from?: EmailAddress[];
  to?: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress[];
  subject?: string;
  sentAt?: string;
  preview?: string;
  textBody?: EmailBodyPart[];
  htmlBody?: EmailBodyPart[];
  bodyValues?: Record<string, EmailBodyValue>;
  attachments?: Attachment[];
  hasAttachment: boolean;
  // Extended header information
  messageId?: string;
  inReplyTo?: string[];
  references?: string[];
  headers?: Record<string, string | string[]>;
  // Security headers parsed
  authenticationResults?: AuthenticationResults;
  spamScore?: number;
  spamStatus?: string;
  spamLLM?: {
    verdict: string;
    explanation: string;
  };
}

export interface AuthenticationResults {
  spf?: {
    result: 'pass' | 'fail' | 'softfail' | 'neutral' | 'none' | 'temperror' | 'permerror';
    domain?: string;
    ip?: string;
  };
  dkim?: {
    result: 'pass' | 'fail' | 'policy' | 'neutral' | 'temperror' | 'permerror';
    domain?: string;
    selector?: string;
  };
  dmarc?: {
    result: 'pass' | 'fail' | 'none';
    policy?: 'reject' | 'quarantine' | 'none';
    domain?: string;
  };
  iprev?: {
    result: 'pass' | 'fail';
    ip?: string;
  };
}

export interface EmailBodyValue {
  value: string;
  isEncodingProblem?: boolean;
  isTruncated?: boolean;
}

export interface EmailAddress {
  name?: string;
  email: string;
}

export interface EmailBodyPart {
  partId: string;
  blobId: string;
  size: number;
  name?: string;
  type: string;
  charset?: string;
  disposition?: string;
  cid?: string;
  language?: string[];
  location?: string;
  subParts?: EmailBodyPart[];
}

export interface Attachment {
  partId: string;
  blobId: string;
  size: number;
  name?: string;
  type: string;
  charset?: string;
  cid?: string;
  disposition?: string;
}

export interface Mailbox {
  id: string;
  originalId?: string; // Original JMAP ID (for shared mailboxes)
  name: string;
  parentId?: string;
  role?: string;
  sortOrder: number;
  totalEmails: number;
  unreadEmails: number;
  totalThreads: number;
  unreadThreads: number;
  myRights: {
    mayReadItems: boolean;
    mayAddItems: boolean;
    mayRemoveItems: boolean;
    maySetSeen: boolean;
    maySetKeywords: boolean;
    mayCreateChild: boolean;
    mayRename: boolean;
    mayDelete: boolean;
    maySubmit: boolean;
  };
  isSubscribed: boolean;
  // Shared folder support
  accountId?: string;
  accountName?: string;
  isShared?: boolean;
}

export interface Thread {
  id: string;
  emailIds: string[];
}

// Thread grouping for UI display
export interface ThreadGroup {
  threadId: string;
  emails: Email[];           // Emails in this thread (sorted by receivedAt desc)
  latestEmail: Email;        // Most recent email
  participantNames: string[];// Unique participant names
  hasUnread: boolean;        // Any unread emails in thread
  hasStarred: boolean;       // Any starred emails in thread
  hasAttachment: boolean;    // Any email has attachment
  emailCount: number;        // Total emails in thread
}

export interface Identity {
  id: string;
  name: string;
  email: string;
  replyTo?: EmailAddress[];
  bcc?: EmailAddress[];
  textSignature?: string;
  htmlSignature?: string;
  mayDelete: boolean;
}

export interface EmailSubmission {
  id: string;
  identityId: string;
  emailId: string;
  threadId?: string;
  envelope: {
    mailFrom: EmailAddress;
    rcptTo: EmailAddress[];
  };
  sendAt?: string;
  undoStatus: "pending" | "final" | "canceled";
  deliveryStatus?: Record<string, DeliveryStatus>;
  dsnBlobIds?: string[];
  mdnBlobIds?: string[];
}

export interface DeliveryStatus {
  smtpReply: string;
  delivered: "queued" | "yes" | "no" | "unknown";
  displayed: "unknown" | "yes";
}

// JMAP Push Notification Types (RFC 8620 Section 7)

export interface StateChange {
  '@type': 'StateChange';
  changed: {
    [accountId: string]: {
      Email?: string;
      Mailbox?: string;
      Thread?: string;
      EmailDelivery?: string;
      EmailSubmission?: string;
      Identity?: string;
    };
  };
}

export interface PushSubscription {
  id: string;
  deviceClientId: string;
  url: string;
  keys: {
    p256dh: string;
    auth: string;
  } | null;
  expires: string | null;
  types: string[] | null;
}

// For tracking last known states
export interface AccountStates {
  [accountId: string]: {
    Email?: string;
    Mailbox?: string;
    Thread?: string;
  };
}

// Contact types (RFC 6350 vCard)
export interface ContactAddress {
  type?: 'home' | 'work' | 'other';
  street?: string;
  city?: string;
  region?: string;
  postcode?: string;
  country?: string;
}

export interface ContactPhone {
  type?: 'home' | 'work' | 'mobile' | 'fax' | 'pager' | 'other';
  number: string;
}

export interface ContactEmail {
  type?: 'home' | 'work' | 'other';
  email: string;
}

export interface Contact {
  id: string;
  uid: string; // vCard UID
  name: string; // Full name
  firstName?: string;
  lastName?: string;
  nickName?: string;
  emails: ContactEmail[];
  phones?: ContactPhone[];
  addresses?: ContactAddress[];
  organization?: string;
  jobTitle?: string;
  notes?: string;
  avatar?: string; // URL or data URI
  categories?: string[]; // Tags/groups
  createdAt?: string;
  updatedAt?: string;
}

export interface ContactGroup {
  id: string;
  name: string;
  description?: string;
  memberIds: string[]; // IDs of contacts in group
  createdAt?: string;
  updatedAt?: string;
}

// Calendar Types (RFC 5545 / JMAP Calendars)
export interface Calendar {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isSubscribed?: boolean;
  isReadOnly?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type EventStatus = 'tentative' | 'confirmed' | 'cancelled';
export type EventTransparency = 'opaque' | 'transparent'; // opaque = busy, transparent = free

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval?: number;
  count?: number;
  until?: string; // ISO 8601 date
  byDay?: string[]; // MO, TU, WE, etc.
  byMonth?: number[]; // 1-12
  byMonthDay?: number[];
}

export interface CalendarEventParticipant {
  name?: string;
  email: string;
  status?: 'accepted' | 'declined' | 'tentative' | 'needs-action';
  role?: 'chair' | 'req-participant' | 'opt-participant' | 'non-participant';
}

export interface CalendarEventAttachment {
  filename?: string;
  type?: string;
  size?: number;
  url?: string;
  blobId?: string;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  duration?: number; // seconds
  isAllDay?: boolean;
  timezone?: string;
  
  // Recurrence
  recurrence?: RecurrenceRule;
  recurrenceId?: string; // For event instances
  isRecurring?: boolean;
  
  // Status and Visibility
  status?: EventStatus;
  transparency?: EventTransparency;
  isPrivate?: boolean;
  
  // Organizer and Participants
  organizer?: CalendarEventParticipant;
  participants?: CalendarEventParticipant[];
  
  // Other
  categories?: string[];
  priority?: number; // 0-9
  attachments?: CalendarEventAttachment[];
  alarm?: {
    action: 'display' | 'email' | 'procedure';
    trigger: string; // ISO 8601 duration (e.g., "PT15M")
  };
  
  createdAt?: string;
  updatedAt?: string;
}