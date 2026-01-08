import type { Email, Mailbox, StateChange, AccountStates, Thread, Identity, Contact, ContactGroup, Calendar, CalendarEvent } from "./types";

// JMAP protocol types - these are intentionally flexible due to server variations
interface JMAPSession {
  apiUrl: string;
  downloadUrl: string;
  uploadUrl?: string;
  eventSourceUrl?: string;
  primaryAccounts?: Record<string, string>;
  accounts?: Record<string, JMAPAccount>;
  capabilities?: Record<string, unknown>;
}

interface JMAPAccount {
  name?: string;
  isPersonal?: boolean;
  isReadOnly?: boolean;
  accountCapabilities?: Record<string, unknown>;
}

interface JMAPQuota {
  resourceType?: string;
  scope?: string;
  used?: number;
  hardLimit?: number;
  limit?: number;
}

interface JMAPMailbox {
  id: string;
  name: string;
  parentId?: string | null;
  role?: string | null;
  totalEmails?: number;
  unreadEmails?: number;
  totalThreads?: number;
  unreadThreads?: number;
  sortOrder?: number;
  isSubscribed?: boolean;
  myRights?: Record<string, boolean>;
}

interface JMAPEmailHeader {
  name: string;
  value: string;
}

// Generic JMAP method call type
type JMAPMethodCall = [string, Record<string, unknown>, string];

// JMAP response types - using flexible types due to protocol variations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JMAPResponseResult = Record<string, any>;

interface JMAPResponse {
  methodResponses: Array<[string, JMAPResponseResult, string]>;
}

export class JMAPClient {
  private serverUrl: string;
  private username: string;
  private password: string;
  private authHeader: string;
  private apiUrl: string = "";
  private accountId: string = "";
  private downloadUrl: string = "";
  private capabilities: Record<string, unknown> = {};
  private session: JMAPSession | null = null;
  private lastPingTime: number = 0;
  private pingInterval: NodeJS.Timeout | null = null;
  private accounts: Record<string, JMAPAccount> = {}; // All accounts (primary + shared)
  private eventSource: EventSource | null = null;
  private stateChangeCallback: ((change: StateChange) => void) | null = null;
  private lastStates: AccountStates = {};

  constructor(serverUrl: string, username: string, password: string) {
    this.serverUrl = serverUrl.replace(/\/$/, '');
    this.username = username;
    this.password = password;
    this.authHeader = `Basic ${btoa(`${username}:${password}`)}`;
  }

  async connect(): Promise<void> {
    // Get the session first
    const sessionUrl = `${this.serverUrl}/.well-known/jmap`;

    try {
      const sessionResponse = await fetch(sessionUrl, {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader,
        },
      });

      if (!sessionResponse.ok) {
        if (sessionResponse.status === 401) {
          throw new Error('Invalid username or password');
        }
        throw new Error(`Failed to get session: ${sessionResponse.status}`);
      }

      const session = await sessionResponse.json();

      // Store the full session for reference
      this.session = session;

      // Extract and store capabilities
      this.capabilities = session.capabilities || {};

      // Extract the API URL
      this.apiUrl = session.apiUrl;

      // Extract the download URL
      this.downloadUrl = session.downloadUrl;

      // Extract and store all accounts (primary + shared)
      this.accounts = session.accounts || {};

      // Extract the primary account ID
      const mailAccount = session.primaryAccounts?.["urn:ietf:params:jmap:mail"];
      if (mailAccount) {
        this.accountId = mailAccount;
      } else {
        // Try to find any account
        if (this.accounts && Object.keys(this.accounts).length > 0) {
          this.accountId = Object.keys(this.accounts)[0];
        } else {
          throw new Error('No mail account found in session');
        }
      }

      // Start keep-alive mechanism
      this.startKeepAlive();
    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  }

  private startKeepAlive(): void {
    // Stop any existing interval
    this.stopKeepAlive();

    // Ping every 30 seconds to keep the connection alive
    const PING_INTERVAL = 30000; // 30 seconds

    this.pingInterval = setInterval(async () => {
      try {
        await this.ping();
      } catch (error) {
        console.error('Keep-alive ping failed:', error);
        // If ping fails, try to reconnect
        try {
          await this.reconnect();
        } catch (reconnectError) {
          console.error('Reconnection failed:', reconnectError);
        }
      }
    }, PING_INTERVAL);
  }

  private stopKeepAlive(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // Get account ID for a specific JMAP capability
  private getAccountIdForCapability(capability: string): string | null {
    // First check primary accounts
    const primaryAccount = this.session?.primaryAccounts?.[capability];
    if (primaryAccount) {
      return primaryAccount;
    }

    // Then check all accounts for this capability
    if (this.accounts && typeof this.accounts === 'object') {
      for (const [accountId, accountData] of Object.entries(this.accounts)) {
        const accountCapabilities = (accountData as any)?.accountCapabilities || (accountData as any)?.capabilities;
        if (accountCapabilities?.[capability]) {
          return accountId;
        }
      }
    }

    // Fallback to main account ID
    return this.accountId || null;
  }

  // Helper methods for event data mapping
  private mapJMAPEventToCalendarEvent(jmapEvent: any, requestedCalendarId?: string): CalendarEvent {
    try {
      // Map JMAP properties to our CalendarEvent interface
      // JMAP uses 'start'/'end', we use 'startTime'/'endTime'
      // JMAP uses 'timeZone', we use 'timezone'
      
      // Handle calendarId - could be single value or calendarIds object
      let calendarId = jmapEvent.calendarId;
      if (!calendarId && jmapEvent.calendarIds && typeof jmapEvent.calendarIds === 'object' && !Array.isArray(jmapEvent.calendarIds)) {
        // Extract first calendar ID from calendarIds object
        const calendarIds = Object.keys(jmapEvent.calendarIds).filter(key => jmapEvent.calendarIds[key] === true);
        calendarId = calendarIds[0] || requestedCalendarId || 'unknown';
      }
      
      // Calculate end time from start + duration if end is missing
      let endTime = jmapEvent.end || jmapEvent.endTime;
      if (!endTime && jmapEvent.start && jmapEvent.duration) {
        // Parse ISO 8601 duration and add to start
        const durationSeconds = this.durationToSeconds(jmapEvent.duration);
        const startDate = new Date(jmapEvent.start);
        endTime = new Date(startDate.getTime() + durationSeconds * 1000).toISOString();
      }
      
      const mappedEvent: CalendarEvent = {
        id: jmapEvent.id,
        calendarId: calendarId || requestedCalendarId || 'unknown',
        title: jmapEvent.title || '',
        description: jmapEvent.description,
        location: jmapEvent.location,
        // Handle both JMAP format (start/end) and our format (startTime/endTime)
        startTime: jmapEvent.start || jmapEvent.startTime,
        endTime: endTime,
        duration: jmapEvent.duration ? this.durationToSeconds(jmapEvent.duration) : undefined,
        isAllDay: jmapEvent.showWithoutTime,
        timezone: jmapEvent.timeZone || jmapEvent.timezone,
        recurrence: jmapEvent.recurrenceRules?.[0] || jmapEvent.recurrence,
        recurrenceId: jmapEvent.recurrenceId,
        status: jmapEvent.status,
        transparency: jmapEvent.showAsFree ? 'transparent' : 'opaque',
        isPrivate: jmapEvent.isPrivate,
        organizer: jmapEvent.organizer,
        participants: jmapEvent.participants,
        categories: jmapEvent.categories,
        priority: jmapEvent.priority,
        attachments: jmapEvent.attachments,
        alarm: jmapEvent.alarm,
        createdAt: jmapEvent.created,
        updatedAt: jmapEvent.updated,
      };
      return mappedEvent;
    } catch (error) {
      console.error('[JMAP] Error mapping JMAP event:', jmapEvent, error);
      // Return minimal event to prevent crashes
      return {
        id: jmapEvent.id || 'unknown',
        calendarId: requestedCalendarId || jmapEvent.calendarId || 'unknown',
        title: jmapEvent.title || 'Untitled Event',
        startTime: jmapEvent.start || jmapEvent.startTime || new Date().toISOString(),
        endTime: jmapEvent.end || jmapEvent.endTime || new Date(Date.now() + 3600000).toISOString(),
      };
    }
  }

  private durationToSeconds(duration: string): number {
    try {
      // Parse ISO 8601 duration (e.g., "PT1H30M")
      const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
      if (!match) return 0;
      
      const hours = match[1] ? parseInt(match[1]) : 0;
      const minutes = match[2] ? parseInt(match[2]) : 0;
      const seconds = match[3] ? parseInt(match[3]) : 0;
      
      return hours * 3600 + minutes * 60 + seconds;
    } catch (error) {
      console.error('Error parsing duration:', duration, error);
      return 0;
    }
  }

  async ping(): Promise<void> {
    if (!this.apiUrl) {
      throw new Error('Not connected');
    }

    const now = Date.now();

    // Use Echo method for lightweight ping
    const response = await this.request([
      ["Core/echo", { ping: "pong" }, "0"]
    ]);

    if (response.methodResponses?.[0]?.[0] === "Core/echo") {
      this.lastPingTime = now;
    } else {
      throw new Error('Ping failed');
    }
  }

  async reconnect(): Promise<void> {
    await this.connect();
  }

  disconnect(): void {
    this.stopKeepAlive();
    this.closePushNotifications();
    this.apiUrl = "";
    this.accountId = "";
    this.session = null;
    this.capabilities = {};
  }

  private async request(methodCalls: JMAPMethodCall[]): Promise<JMAPResponse> {
    if (!this.apiUrl) {
      throw new Error('Not connected. Call connect() first.');
    }

    const requestBody = {
      using: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail", "urn:ietf:params:jmap:calendars"],
      methodCalls: methodCalls,
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('Request failed:', response.status, responseText);
      throw new Error(`Request failed: ${response.status} - ${responseText.substring(0, 200)}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse response:', responseText);
      throw new Error('Invalid JSON response from server');
    }

    return data;
  }

  async getQuota(): Promise<{ used: number; total: number } | null> {
    try {
      const response = await this.request([
        ["Quota/get", {
          accountId: this.accountId,
        }, "0"]
      ]);

      if (response.methodResponses?.[0]?.[0] === "Quota/get") {
        const quotas = (response.methodResponses[0][1].list || []) as JMAPQuota[];
        // Find the mail quota if it exists
        const mailQuota = quotas.find((q) => q.resourceType === "mail" || q.scope === "mail");

        if (mailQuota) {
          return {
            used: mailQuota.used ?? 0,
            total: mailQuota.hardLimit ?? mailQuota.limit ?? 0
          };
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  async getMailboxes(): Promise<Mailbox[]> {
    try {
      const response = await this.request([
        ["Mailbox/get", {
          accountId: this.accountId,
        }, "0"]
      ]);

      if (response.methodResponses?.[0]?.[0] === "Mailbox/get") {
        const rawMailboxes = (response.methodResponses[0][1].list || []) as JMAPMailbox[];

        // Map and ensure all required fields are present
        const mailboxes = rawMailboxes.map((mb) => {
          return {
            id: mb.id,
            originalId: undefined, // Primary account uses original IDs
            name: mb.name,
            parentId: mb.parentId || undefined,
            role: mb.role || undefined,
            sortOrder: mb.sortOrder ?? 0,
            totalEmails: mb.totalEmails ?? 0,
            unreadEmails: mb.unreadEmails ?? 0,
            totalThreads: mb.totalThreads ?? 0,
            unreadThreads: mb.unreadThreads ?? 0,
            myRights: mb.myRights || {
              mayReadItems: true,
              mayAddItems: true,
              mayRemoveItems: true,
              maySetSeen: true,
              maySetKeywords: true,
              mayCreateChild: true,
              mayRename: true,
              mayDelete: true,
              maySubmit: true,
            },
            isSubscribed: mb.isSubscribed ?? true,
            // Account info for primary account
            accountId: this.accountId,
            accountName: this.accounts[this.accountId]?.name || this.username,
            isShared: false,
          } as Mailbox;
        });

        return mailboxes;
      }

      throw new Error('Unexpected response format');
    } catch (error) {
      console.error('Failed to get mailboxes:', error);
      // Return default inbox with all required fields
      return [{
        id: 'INBOX',
        originalId: undefined,
        name: 'Inbox',
        role: 'inbox',
        sortOrder: 0,
        totalEmails: 0,
        unreadEmails: 0,
        totalThreads: 0,
        unreadThreads: 0,
        myRights: {
          mayReadItems: true,
          mayAddItems: true,
          mayRemoveItems: true,
          maySetSeen: true,
          maySetKeywords: true,
          mayCreateChild: true,
          mayRename: true,
          mayDelete: true,
          maySubmit: true,
        },
        isSubscribed: true,
        accountId: this.accountId,
        accountName: this.username,
        isShared: false,
      }] as Mailbox[];
    }
  }

  async getAllMailboxes(): Promise<Mailbox[]> {
    try {
      const allMailboxes: Mailbox[] = [];

      // Get all account IDs
      const accountIds = Object.keys(this.accounts);

      // If no accounts, fallback to primary only
      if (accountIds.length === 0) {
        return this.getMailboxes();
      }

      // Fetch mailboxes for each account
      for (const accountId of accountIds) {
        const account = this.accounts[accountId];
        const isPrimary = accountId === this.accountId;

        try {
          const response = await this.request([
            ["Mailbox/get", {
              accountId: accountId,
            }, "0"]
          ]);

          if (response.methodResponses?.[0]?.[0] === "Mailbox/get") {
            const rawMailboxes = (response.methodResponses[0][1].list || []) as JMAPMailbox[];

            // Map mailboxes with account info
            const mailboxes = rawMailboxes.map((mb) => {
              return {
                id: isPrimary ? mb.id : `${accountId}:${mb.id}`, // Namespace shared mailbox IDs
                originalId: mb.id, // Keep original ID for JMAP queries
                name: mb.name,
                parentId: mb.parentId ? (isPrimary ? mb.parentId : `${accountId}:${mb.parentId}`) : undefined,
                role: mb.role || undefined,
                sortOrder: mb.sortOrder ?? 0,
                totalEmails: mb.totalEmails ?? 0,
                unreadEmails: mb.unreadEmails ?? 0,
                totalThreads: mb.totalThreads ?? 0,
                unreadThreads: mb.unreadThreads ?? 0,
                myRights: mb.myRights || {
                  mayReadItems: true,
                  mayAddItems: true,
                  mayRemoveItems: true,
                  maySetSeen: true,
                  maySetKeywords: true,
                  mayCreateChild: true,
                  mayRename: true,
                  mayDelete: true,
                  maySubmit: true,
                },
                isSubscribed: mb.isSubscribed ?? true,
                // Account info
                accountId: accountId,
                accountName: account?.name || (isPrimary ? this.username : accountId),
                isShared: !isPrimary,
              } as Mailbox;
            });

            allMailboxes.push(...mailboxes);
          }
        } catch (error) {
          console.error(`Failed to fetch mailboxes for account ${accountId}:`, error);
          // Continue with other accounts even if one fails
        }
      }

      return allMailboxes;
    } catch (error) {
      console.error("Failed to fetch all mailboxes:", error);
      // Fallback to primary account mailboxes
      return this.getMailboxes();
    }
  }

  /**
   * Get the raw message content (RFC822 source) as a string
   */
  async getRawEmail(emailId: string, accountId?: string): Promise<string> {
    const targetAccountId = accountId || this.accountId;
    
    if (!this.downloadUrl) {
      throw new Error('Download URL not available. Please reconnect.');
    }

    // IMPORTANT: In JMAP, emailId is NOT the same as blobId. 
    // We must first fetch the blobId for this email.
    const response = await this.request([
      ["Email/get", {
        accountId: targetAccountId,
        ids: [emailId],
        properties: ["blobId"]
      }, "0"],
    ]);

    const email = response.methodResponses?.[0]?.[1]?.list?.[0];
    if (!email || !email.blobId) {
      throw new Error("Blob ID not found for email " + emailId);
    }

    let url = this.downloadUrl;
    url = url.replace('{accountId}', encodeURIComponent(targetAccountId));
    url = url.replace('{blobId}', encodeURIComponent(email.blobId));
    url = url.replace('{name}', encodeURIComponent('message.eml'));
    url = url.replace('{type}', encodeURIComponent('message/rfc822'));
    
    const fetchResponse = await fetch(url, {
      headers: {
        'Authorization': this.authHeader,
      },
    });

    if (!fetchResponse.ok) {
      throw new Error(`Failed to fetch raw email: ${fetchResponse.status}`);
    }

    return await fetchResponse.text();
  }

  /**
   * Get all headers for an email, with improved format for raw header viewing
   */
  async getEmailHeaders(emailId: string, accountId?: string): Promise<Record<string, string | string[]>> {
    const targetAccountId = accountId || this.accountId;

    const response = await this.request([
      ["Email/get", {
        accountId: targetAccountId,
        ids: [emailId],
        properties: ["headers"]
      }, "0"],
    ]);

    if (response.methodResponses?.[0]?.[0] === "Email/get") {
      const email = response.methodResponses[0][1].list?.[0];
      if (email && email.headers) {
        const headersRecord: Record<string, string | string[]> = {};
        (email.headers as JMAPEmailHeader[]).forEach((header) => {
          if (header && header.name) {
            if (headersRecord[header.name]) {
              if (Array.isArray(headersRecord[header.name])) {
                (headersRecord[header.name] as string[]).push(header.value);
              } else {
                headersRecord[header.name] = [headersRecord[header.name] as string, header.value];
              }
            } else {
              headersRecord[header.name] = header.value;
            }
          }
        });
        return headersRecord;
      }
    }
    
    return {};
  }

  async getEmails(mailboxId?: string, accountId?: string, limit: number = 50, position: number = 0): Promise<{ emails: Email[], hasMore: boolean, total: number }> {
    try {
      // Use provided accountId or fallback to primary account
      const targetAccountId = accountId || this.accountId;

      // Build filter - only add inMailbox if we have a mailboxId
      const filter: { inMailbox?: string } = {};
      if (mailboxId && mailboxId !== '') {
        filter.inMailbox = mailboxId;
      }

      const response = await this.request([
        ["Email/query", {
          accountId: targetAccountId,
          filter: filter,
          sort: [{ property: "receivedAt", isAscending: false }],
          limit: limit,
          position: position,
        }, "0"],
        ["Email/get", {
          accountId: targetAccountId,
          "#ids": {
            resultOf: "0",
            name: "Email/query",
            path: "/ids",
          },
          properties: [
            "id",
            "threadId",
            "mailboxIds",
            "keywords",
            "size",
            "receivedAt",
            "from",
            "to",
            "cc",
            "subject",
            "preview",
            "hasAttachment",
          ],
        }, "1"],
      ]);

      const queryResponse = response.methodResponses?.[0]?.[1];
      const getResponse = response.methodResponses?.[1]?.[1];

      if (response.methodResponses?.[1]?.[0] === "Email/get" && getResponse) {
        const emails = getResponse.list || [];

        // Stalwart doesn't return 'total', so we use a different strategy:
        // If we got exactly 'limit' emails, there might be more
        // If we got fewer, we've reached the end
        const total = queryResponse?.total || 0;
        const hasMore = total > 0
          ? (position + emails.length) < total  // Use total if available
          : emails.length === limit;             // Otherwise, check if we got a full page

        // If fetching from a shared account, namespace the mailboxIds to match our store
        const isSharedAccount = accountId && accountId !== this.accountId;
        if (isSharedAccount) {
          emails.forEach((email: Email) => {
            if (email.mailboxIds) {
              const namespacedMailboxIds: Record<string, boolean> = {};
              Object.keys(email.mailboxIds).forEach(mbId => {
                namespacedMailboxIds[`${accountId}:${mbId}`] = email.mailboxIds[mbId];
              });
              email.mailboxIds = namespacedMailboxIds;
            }
          });
        }

        return { emails, hasMore, total };
      }

      return { emails: [], hasMore: false, total: 0 };
    } catch (error) {
      console.error('Failed to get emails:', error);
      return { emails: [], hasMore: false, total: 0 };
    }
  }

  async getEmail(emailId: string, accountId?: string): Promise<Email | null> {
    try {
      // Use provided accountId or fallback to primary account
      const targetAccountId = accountId || this.accountId;

      const response = await this.request([
        ["Email/get", {
          accountId: targetAccountId,
          ids: [emailId],
          properties: [
            "id",
            "threadId",
            "mailboxIds",
            "keywords",
            "size",
            "receivedAt",
            "sentAt",
            "from",
            "to",
            "cc",
            "bcc",
            "replyTo",
            "subject",
            "preview",
            "textBody",
            "htmlBody",
            "bodyValues",
            "hasAttachment",
            "attachments",
            "messageId",
            "inReplyTo",
            "references",
            "headers",
          ],
          fetchTextBodyValues: true,
          fetchHTMLBodyValues: true,
          fetchAllBodyValues: true,
          maxBodyValueBytes: 256000,
        }, "0"],
      ]);

      if (response.methodResponses?.[0]?.[0] === "Email/get") {
        const emails = response.methodResponses[0][1].list || [];
        const email = emails[0];

        if (email) {
          // If fetching from a shared account, namespace the mailboxIds to match our store
          const isSharedAccount = accountId && accountId !== this.accountId;
          if (isSharedAccount && email.mailboxIds) {
            const namespacedMailboxIds: Record<string, boolean> = {};
            Object.keys(email.mailboxIds).forEach(mbId => {
              namespacedMailboxIds[`${accountId}:${mbId}`] = email.mailboxIds[mbId];
            });
            email.mailboxIds = namespacedMailboxIds;
          }

          // Parse headers if available
          if (email.headers) {
            // Import the parsing functions
            const { parseAuthenticationResults, parseSpamScore, parseSpamLLM } = await import('@/lib/email-headers');

            // Convert headers array to Record format if needed
            let headersRecord: Record<string, string | string[]>;
            if (Array.isArray(email.headers)) {
              headersRecord = {};
              (email.headers as JMAPEmailHeader[]).forEach((header) => {
                if (header && header.name && header.value) {
                  // If header already exists, convert to array or append
                  if (headersRecord[header.name]) {
                    if (Array.isArray(headersRecord[header.name])) {
                      (headersRecord[header.name] as string[]).push(header.value);
                    } else {
                      headersRecord[header.name] = [headersRecord[header.name] as string, header.value];
                    }
                  } else {
                    headersRecord[header.name] = header.value;
                  }
                }
              });
              // Replace array with record for easier access
              email.headers = headersRecord;
            } else {
              headersRecord = email.headers as Record<string, string | string[]>;
            }

            // Parse Authentication-Results header
            const authResultsHeader = headersRecord['Authentication-Results'];
            if (authResultsHeader) {
              const headerValue = Array.isArray(authResultsHeader) ? authResultsHeader[0] : authResultsHeader;
              email.authenticationResults = parseAuthenticationResults(headerValue);
            }

            // Parse Spam headers
            const spamHeaders = ['X-Spam-Status', 'X-Spam-Result', 'X-Rspamd-Score'];
            for (const header of spamHeaders) {
              if (headersRecord[header]) {
                const headerValue = Array.isArray(headersRecord[header]) ? headersRecord[header][0] : headersRecord[header];
                const spamResult = parseSpamScore(headerValue as string);
                if (spamResult) {
                  email.spamScore = spamResult.score;
                  email.spamStatus = spamResult.status;
                  break;
                }
              }
            }

            // Parse X-Spam-LLM header
            if (headersRecord['X-Spam-LLM']) {
              const llmHeader = Array.isArray(headersRecord['X-Spam-LLM'])
                ? headersRecord['X-Spam-LLM'][0]
                : headersRecord['X-Spam-LLM'];
              const llmResult = parseSpamLLM(llmHeader as string);
              if (llmResult) {
                email.spamLLM = llmResult;
              }
            }
          }

          return email;
        }

        return null;
      }

      return null;
    } catch (error) {
      console.error('Failed to get email:', error);
      return null;
    }
  }

  async markAsRead(emailId: string, read: boolean = true, accountId?: string): Promise<void> {
    // Use provided accountId or fallback to primary account
    const targetAccountId = accountId || this.accountId;

    await this.request([
      ["Email/set", {
        accountId: targetAccountId,
        update: {
          [emailId]: {
            "keywords/$seen": read,
          },
        },
      }, "0"],
    ]);
  }

  async batchMarkAsRead(emailIds: string[], read: boolean = true): Promise<void> {
    if (emailIds.length === 0) return;

    const updates: Record<string, { "keywords/$seen": boolean }> = {};
    emailIds.forEach(id => {
      updates[id] = {
        "keywords/$seen": read,
      };
    });

    await this.request([
      ["Email/set", {
        accountId: this.accountId,
        update: updates,
      }, "0"],
    ]);
  }

  async toggleStar(emailId: string, starred: boolean): Promise<void> {
    await this.request([
      ["Email/set", {
        accountId: this.accountId,
        update: {
          [emailId]: {
            "keywords/$flagged": starred,
          },
        },
      }, "0"],
    ]);
  }

  async updateEmailKeywords(emailId: string, keywords: Record<string, boolean>): Promise<void> {
    await this.request([
      ["Email/set", {
        accountId: this.accountId,
        update: {
          [emailId]: {
            keywords,
          },
        },
      }, "0"],
    ]);
  }

  async deleteEmail(emailId: string): Promise<void> {
    await this.request([
      ["Email/set", {
        accountId: this.accountId,
        destroy: [emailId],
      }, "0"],
    ]);
  }

  async moveToTrash(emailId: string, trashMailboxId: string, accountId?: string): Promise<void> {
    const targetAccountId = accountId || this.accountId;
    await this.request([
      ["Email/set", {
        accountId: targetAccountId,
        update: {
          [emailId]: {
            mailboxIds: { [trashMailboxId]: true },
          },
        },
      }, "0"],
    ]);
  }

  async batchDeleteEmails(emailIds: string[]): Promise<void> {
    if (emailIds.length === 0) return;

    await this.request([
      ["Email/set", {
        accountId: this.accountId,
        destroy: emailIds,
      }, "0"],
    ]);
  }

  async batchMoveEmails(emailIds: string[], toMailboxId: string): Promise<void> {
    if (emailIds.length === 0) return;

    const updates: Record<string, { mailboxIds: Record<string, boolean> }> = {};
    emailIds.forEach(id => {
      updates[id] = {
        mailboxIds: { [toMailboxId]: true },
      };
    });

    await this.request([
      ["Email/set", {
        accountId: this.accountId,
        update: updates,
      }, "0"],
    ]);
  }

  async moveEmail(emailId: string, toMailboxId: string): Promise<void> {
    await this.request([
      ["Email/set", {
        accountId: this.accountId,
        update: {
          [emailId]: {
            mailboxIds: { [toMailboxId]: true },
          },
        },
      }, "0"],
    ]);
  }

  async searchEmails(query: string, mailboxId?: string, accountId?: string, limit: number = 50, position: number = 0): Promise<{ emails: Email[], hasMore: boolean, total: number }> {
    try {
      // Use provided accountId or fallback to primary account
      const targetAccountId = accountId || this.accountId;

      // Build filter with text search, optionally scoped to a mailbox
      const filter: Record<string, unknown> = { text: query };
      if (mailboxId) {
        filter.inMailbox = mailboxId;
      }

      const response = await this.request([
        ["Email/query", {
          accountId: targetAccountId,
          filter: filter,
          sort: [{ property: "receivedAt", isAscending: false }],
          limit: limit,
          position: position,
        }, "0"],
        ["Email/get", {
          accountId: targetAccountId,
          "#ids": {
            resultOf: "0",
            name: "Email/query",
            path: "/ids",
          },
          properties: [
            "id",
            "threadId",
            "mailboxIds",
            "keywords",
            "size",
            "receivedAt",
            "from",
            "to",
            "cc",
            "subject",
            "preview",
            "hasAttachment",
          ],
        }, "1"],
      ]);

      const queryResponse = response.methodResponses?.[0]?.[1];
      const emails = response.methodResponses?.[1]?.[1]?.list || [];

      // Stalwart doesn't always return 'total', so we use a different strategy:
      // If we got exactly 'limit' emails, there might be more
      // If we got fewer, we've reached the end
      const total = queryResponse?.total || 0;
      const hasMore = total > 0
        ? (position + emails.length) < total  // Use total if available
        : emails.length === limit;             // Otherwise, check if we got a full page

      return { emails, hasMore, total };
    } catch (error) {
      console.error('Search failed:', error);
      return { emails: [], hasMore: false, total: 0 };
    }
  }

  // Thread methods for conversation view
  async getThread(threadId: string, accountId?: string): Promise<Thread | null> {
    try {
      const targetAccountId = accountId || this.accountId;

      const response = await this.request([
        ["Thread/get", {
          accountId: targetAccountId,
          ids: [threadId],
        }, "0"],
      ]);

      if (response.methodResponses?.[0]?.[0] === "Thread/get") {
        const threads = response.methodResponses[0][1].list || [];
        return threads[0] || null;
      }

      return null;
    } catch (error) {
      console.error('Failed to get thread:', error);
      return null;
    }
  }

  async getThreadEmails(threadId: string, accountId?: string): Promise<Email[]> {
    try {
      const targetAccountId = accountId || this.accountId;

      // First get the thread to find all email IDs
      const thread = await this.getThread(threadId, accountId);
      if (!thread || !thread.emailIds || thread.emailIds.length === 0) {
        return [];
      }

      // Fetch all emails in the thread
      const response = await this.request([
        ["Email/get", {
          accountId: targetAccountId,
          ids: thread.emailIds,
          properties: [
            "id",
            "threadId",
            "mailboxIds",
            "keywords",
            "size",
            "receivedAt",
            "from",
            "to",
            "cc",
            "subject",
            "preview",
            "hasAttachment",
            "blobId",
          ],
        }, "0"],
      ]);

      if (response.methodResponses?.[0]?.[0] === "Email/get") {
        const emails = response.methodResponses[0][1].list || [];

        // If fetching from a shared account, namespace the mailboxIds
        const isSharedAccount = accountId && accountId !== this.accountId;
        if (isSharedAccount) {
          emails.forEach((email: Email) => {
            if (email.mailboxIds) {
              const namespacedMailboxIds: Record<string, boolean> = {};
              Object.keys(email.mailboxIds).forEach(mbId => {
                namespacedMailboxIds[`${accountId}:${mbId}`] = email.mailboxIds[mbId];
              });
              email.mailboxIds = namespacedMailboxIds;
            }
          });
        }

        // Sort by receivedAt descending (newest first)
        return emails.sort((a: Email, b: Email) =>
          new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
        );
      }

      return [];
    } catch (error) {
      console.error('Failed to get thread emails:', error);
      return [];
    }
  }

  async getIdentities(): Promise<Identity[]> {
    try {
      const response = await this.request([
        ["Identity/get", {
          accountId: this.accountId,
        }, "0"]
      ]);

      if (response.methodResponses?.[0]?.[0] === "Identity/get") {
        const identities = (response.methodResponses[0][1].list || []) as Identity[];
        return identities;
      }

      return [];
    } catch (error) {
      console.error('Failed to get identities:', error);
      return [];
    }
  }

  async createDraft(
    to: string[],
    subject: string,
    body: string,
    cc?: string[],
    bcc?: string[],
    draftId?: string,
    attachments?: Array<{ blobId: string; name: string; type: string; size: number }>,
    fromEmail?: string
  ): Promise<string> {
    // Find the drafts mailbox
    const mailboxes = await this.getMailboxes();
    const draftsMailbox = mailboxes.find(mb => mb.role === 'drafts');

    if (!draftsMailbox) {
      throw new Error('No drafts mailbox found');
    }

    const emailId = `draft-${Date.now()}`;

    // Build email object with attachments if provided
    interface EmailDraft {
      from: { email: string }[];
      to: { email: string }[];
      cc?: { email: string }[];
      bcc?: { email: string }[];
      subject: string;
      keywords: Record<string, boolean>;
      mailboxIds: Record<string, boolean>;
      bodyValues: Record<string, { value: string }>;
      textBody: { partId: string }[];
      attachments?: { blobId: string; type: string; name: string; disposition: string }[];
    }
    const emailData: EmailDraft = {
      from: [{ email: fromEmail || this.username }],
      to: to.map(email => ({ email })),
      cc: cc?.map(email => ({ email })),
      bcc: bcc?.map(email => ({ email })),
      subject: subject,
      keywords: { "$draft": true },
      mailboxIds: { [draftsMailbox.id]: true },
      bodyValues: {
        "1": {
          value: body,
        },
      },
      textBody: [
        {
          partId: "1",
        },
      ],
    };

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      emailData.attachments = attachments.map(att => ({
        blobId: att.blobId,
        type: att.type,
        name: att.name,
        disposition: "attachment",
      }));
    }

    // If updating an existing draft, destroy it first then create new one
    // This is simpler than trying to update individual fields
    const methodCalls: JMAPMethodCall[] = [];

    if (draftId) {
      // Delete old draft
      methodCalls.push(["Email/set", {
        accountId: this.accountId,
        destroy: [draftId],
      }, "0"]);

      // Create new draft
      methodCalls.push(["Email/set", {
        accountId: this.accountId,
        create: {
          [emailId]: emailData
        },
      }, "1"]);
    } else {
      // Just create new draft
      methodCalls.push(["Email/set", {
        accountId: this.accountId,
        create: {
          [emailId]: emailData
        },
      }, "0"]);
    }

    const response = await this.request(methodCalls);

    console.log('Draft save response:', JSON.stringify(response, null, 2));

    // If we're updating (destroy + create), check the second response
    // Otherwise check the first response
    const responseIndex = draftId ? 1 : 0;

    if (response.methodResponses?.[responseIndex]?.[0] === "Email/set") {
      const result = response.methodResponses[responseIndex][1];

      // Check for errors
      if (result.notCreated || result.notUpdated) {
        const errors = result.notCreated || result.notUpdated;
        const firstError = Object.values(errors)[0] as { description?: string; type?: string };
        console.error('Draft save error:', firstError);
        throw new Error(firstError?.description || firstError?.type || 'Failed to save draft');
      }

      if (result.created?.[emailId]) {
        console.log('Draft created successfully:', result.created[emailId].id);
        return result.created[emailId].id;
      }
    }

    console.error('Unexpected draft save response:', response);
    throw new Error('Failed to save draft');
  }

  async sendEmail(
    to: string[],
    subject: string,
    body: string,
    cc?: string[],
    bcc?: string[],
    draftId?: string,
    fromEmail?: string,
    selectedIdentityId?: string
  ): Promise<void> {
    const emailId = draftId || `draft-${Date.now()}`;

    // Find the Sent mailbox
    const mailboxes = await this.getMailboxes();
    const sentMailbox = mailboxes.find(mb => mb.role === 'sent');

    if (!sentMailbox) {
      throw new Error('No sent mailbox found');
    }

    // Fetch identities to get the full identity object (name + email)
    const identityResponse = await this.request([
      ["Identity/get", {
        accountId: this.accountId,
      }, "0"]
    ]);

    let identityId = selectedIdentityId;
    let selectedIdentity: { id: string; email: string; name: string } | null = null;

    if (identityResponse.methodResponses?.[0]?.[0] === "Identity/get") {
      const identities = (identityResponse.methodResponses[0][1].list || []) as { id: string; email: string; name: string }[];

      if (selectedIdentityId) {
        // Find the selected identity
        selectedIdentity = identities.find((id) => id.id === selectedIdentityId) || null;
        if (selectedIdentity) {
          identityId = selectedIdentity.id;
        }
      } else if (identities.length > 0) {
        // Use the first identity (or find one matching the fromEmail/username)
        selectedIdentity = identities.find((id) => id.email === (fromEmail || this.username)) || identities[0];
        identityId = selectedIdentity.id;
      }
    }

    if (!identityId) {
      identityId = this.accountId; // fallback
    }

    const methodCalls: JMAPMethodCall[] = [];

    // Prepare the 'from' field with name and email
    const fromAddress = {
      email: fromEmail || this.username,
      ...(selectedIdentity?.name && { name: selectedIdentity.name })
    };

    // If we have a draftId, we need to create a new email (not update the draft)
    // because the 'from' field is immutable in JMAP
    if (draftId) {
      // Create a new email with the correct 'from' field and content
      const newEmailId = `sent-${Date.now()}`;
      methodCalls.push(["Email/set", {
        accountId: this.accountId,
        create: {
          [newEmailId]: {
            from: [fromAddress],
            to: to.map(email => ({ email })),
            cc: cc?.map(email => ({ email })),
            bcc: bcc?.map(email => ({ email })),
            subject: subject,
            keywords: { "$seen": true },
            mailboxIds: { [sentMailbox.id]: true },
            bodyValues: {
              "1": {
                value: body,
              },
            },
            textBody: [
              {
                partId: "1",
              },
            ],
          },
        },
        destroy: [draftId], // Delete the old draft
      }, "0"]);
      methodCalls.push(["EmailSubmission/set", {
        accountId: this.accountId,
        create: {
          "1": {
            emailId: `#${newEmailId}`,
            identityId: identityId,
          },
        },
      }, "1"]);
    } else {
      methodCalls.push(["Email/set", {
        accountId: this.accountId,
        create: {
          [emailId]: {
            from: [fromAddress],
            to: to.map(email => ({ email })),
            cc: cc?.map(email => ({ email })),
            bcc: bcc?.map(email => ({ email })),
            subject: subject,
            keywords: { "$seen": true },
            mailboxIds: { [sentMailbox.id]: true },
            bodyValues: {
              "1": {
                value: body,
              },
            },
            textBody: [
              {
                partId: "1",
              },
            ],
          },
        },
      }, "0"]);
      methodCalls.push(["EmailSubmission/set", {
        accountId: this.accountId,
        create: {
          "1": {
            emailId: `#${emailId}`,
            identityId: identityId,
          },
        },
      }, "1"]);
    }

    const response = await this.request(methodCalls);

    // Check for errors in the response
    if (response.methodResponses) {
      for (const [methodName, result] of response.methodResponses) {
        if (methodName.endsWith('/error')) {
          console.error('JMAP method error:', result);
          throw new Error(result.description || `Failed to send email: ${result.type}`);
        }

        // Check for notCreated/notUpdated
        if (result.notCreated || result.notUpdated) {
          const errors = result.notCreated || result.notUpdated;
          const firstError = Object.values(errors)[0] as { description?: string; type?: string };
          console.error('Email send error:', firstError);
          throw new Error(firstError?.description || firstError?.type || 'Failed to send email');
        }
      }
    }

    // Auto-collect recipients to "Auto collected" address book
    try {
      const allRecipients = [
        ...to.map(email => ({ email, name: '' })),
        ...(cc?.map(email => ({ email, name: '' })) || []),
      ];

      if (allRecipients.length > 0) {
        await this.addAutoCollectedContacts(allRecipients);
      }
    } catch (error) {
      // Don't throw error if auto-collection fails - it's not critical
      console.error('Failed to auto-collect contacts:', error);
    }
  }

  private async addAutoCollectedContacts(recipients: Array<{ email: string; name: string }>) {
    try {
      // Query for address books
      const abResponse = await this.request([
        ["AddressBook/query", {
          accountId: this.accountId
        }, "0"]
      ]);

      const abQueryResponse = abResponse.methodResponses?.find((m: any) => m[0] === "AddressBook/query");
      const addressBookIds = abQueryResponse?.[1]?.ids || [];

      // Get address book details
      let autoCollectedBook = null;
      if (addressBookIds.length > 0) {
        const abGetResponse = await this.request([
          ["AddressBook/get", {
            accountId: this.accountId,
            ids: addressBookIds
          }, "0"]
        ]);

        const abGetResult = abGetResponse.methodResponses?.find((m: any) => m[0] === "AddressBook/get");
        const books = abGetResult?.[1]?.list || [];
        autoCollectedBook = books.find((book: any) => book.name === 'Auto collected');
      }

      if (!autoCollectedBook) {
        // Create the address book
        const createResponse = await this.request([
          ["AddressBook/set", {
            accountId: this.accountId,
            create: {
              "auto-collected": {
                name: "Auto collected",
                description: "Automatically collected contacts from sent emails"
              }
            }
          }, "0"]
        ]);

        const setResponse = createResponse.methodResponses?.find((m: any) => m[0] === "AddressBook/set");
        if (setResponse?.[1]?.created?.["auto-collected"]) {
          autoCollectedBook = {
            id: setResponse[1].created["auto-collected"].id,
            name: "Auto collected",
            description: "Automatically collected contacts from sent emails"
          };
        } else {
          console.warn('Failed to create Auto collected address book');
          return;
        }
      }

      // Get existing contacts in the address book to avoid duplicates
      const existingContacts = await this.getAddressBookContacts(autoCollectedBook.id);
      const existingEmails = new Set(existingContacts.map((c: any) => c.emails?.[0]?.value.toLowerCase()));

      // Add new recipients that don't already exist
      const newContacts: { [key: string]: any } = {};
      let contactIndex = 0;

      for (const recipient of recipients) {
        if (!existingEmails.has(recipient.email.toLowerCase())) {
          newContacts[`new-${contactIndex}`] = {
            kind: "individual",
            name: recipient.name || recipient.email,
            emails: [
              {
                type: "personal",
                value: recipient.email
              }
            ]
          };
          contactIndex++;
        }
      }

      if (contactIndex > 0) {
        await this.request([
          ["ContactCard/set", {
            accountId: this.accountId,
            create: {
              ...newContacts
            },
            onContactGroupIds: [autoCollectedBook.id]
          }, "0"]
        ]);
        console.log(`Added ${contactIndex} new auto-collected contacts`);
      }
    } catch (error) {
      console.error('Error in addAutoCollectedContacts:', error);
    }
  }

  private async getAddressBookContacts(addressBookId: string) {
    try {
      const response = await this.request([
        ["ContactCard/query", {
          accountId: this.accountId,
          filter: {
            inContactGroup: addressBookId
          }
        }, "0"]
      ]);

      const queryResponse = response.methodResponses?.find((m: any) => m[0] === "ContactCard/query");
      const contactIds = queryResponse?.[1]?.ids || [];

      if (contactIds.length === 0) return [];

      const getResponse = await this.request([
        ["ContactCard/get", {
          accountId: this.accountId,
          ids: contactIds
        }, "0"]
      ]);

      const getResult = getResponse.methodResponses?.find((m: any) => m[0] === "ContactCard/get");
      return getResult?.[1]?.list || [];
    } catch (error) {
      console.error('Error getting address book contacts:', error);
      return [];
    }
  }


  async uploadBlob(file: File): Promise<{ blobId: string; size: number; type: string }> {
    if (!this.session) {
      throw new Error('Not connected. Call connect() first.');
    }

    // Get upload URL from session
    const uploadUrl = this.session.uploadUrl;
    if (!uploadUrl) {
      throw new Error('Upload URL not available');
    }

    // Replace accountId in the upload URL
    const finalUploadUrl = uploadUrl.replace('{accountId}', encodeURIComponent(this.accountId));
    console.log('Uploading file to:', finalUploadUrl);
    console.log('File info:', { name: file.name, size: file.size, type: file.type });

    const response = await fetch(finalUploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file, // Send the file directly as binary
    });

    console.log('Upload response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload failed:', errorText);
      throw new Error(`Failed to upload file: ${response.status} - ${errorText}`);
    }

    const responseText = await response.text();
    console.log('Upload response body:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
      console.log('Parsed upload response:', JSON.stringify(result, null, 2));
    } catch {
      console.error('Failed to parse upload response as JSON:', responseText);
      throw new Error('Invalid JSON response from upload');
    }

    // Try different response formats
    // Format 1: Direct response { blobId, type, size }
    if (result.blobId) {
      console.log('Using direct response format');
      return {
        blobId: result.blobId,
        size: result.size || file.size,
        type: result.type || file.type,
      };
    }

    // Format 2: Nested under accountId { accountId: { blobId, type, size } }
    const blobInfo = result[this.accountId];
    if (blobInfo && blobInfo.blobId) {
      console.log('Using accountId-nested response format');
      return {
        blobId: blobInfo.blobId,
        size: blobInfo.size || file.size,
        type: blobInfo.type || file.type,
      };
    }

    // If neither format works, show what we got
    console.error('Unexpected upload response format:', result);
    throw new Error('Invalid upload response: blobId not found');
  }

  getBlobDownloadUrl(blobId: string, name?: string, type?: string): string {
    if (!this.downloadUrl) {
      throw new Error('Download URL not available. Please reconnect.');
    }

    // The downloadUrl is a URI Template (RFC 6570 level 1) with variables
    // like {accountId}, {blobId}, {name}, and {type}
    let url = this.downloadUrl;

    // Replace template variables with actual values
    url = url.replace('{accountId}', encodeURIComponent(this.accountId));
    url = url.replace('{blobId}', encodeURIComponent(blobId));

    // Replace {name} - use a default if not provided
    const fileName = name || 'download';
    url = url.replace('{name}', encodeURIComponent(fileName));

    // Replace {type} - URL encode it since it may contain slashes (e.g., "application/pdf")
    // If type is not provided, use a generic binary type
    const mimeType = type || 'application/octet-stream';
    url = url.replace('{type}', encodeURIComponent(mimeType));

    return url;
  }

  // Capability checking methods
  getCapabilities(): Record<string, unknown> {
    return this.capabilities;
  }

  hasCapability(capability: string): boolean {
    return capability in this.capabilities;
  }

  getMaxSizeUpload(): number {
    const coreCapability = this.capabilities["urn:ietf:params:jmap:core"] as { maxSizeUpload?: number } | undefined;
    return coreCapability?.maxSizeUpload || 0;
  }

  getMaxCallsInRequest(): number {
    const coreCapability = this.capabilities["urn:ietf:params:jmap:core"] as { maxCallsInRequest?: number } | undefined;
    return coreCapability?.maxCallsInRequest || 50;
  }

  getEventSourceUrl(): string | null {
    const session = this.session;
    if (!session) {
      return null;
    }
    // RFC 8620: eventSourceUrl is at session root level
    if (session.eventSourceUrl) {
      return session.eventSourceUrl;
    }
    // Some servers may put it in capabilities
    const coreCapability = session.capabilities?.["urn:ietf:params:jmap:core"] as { eventSourceUrl?: string } | undefined;
    if (coreCapability?.eventSourceUrl) {
      return coreCapability.eventSourceUrl;
    }
    return null;
  }

  getAccountId(): string {
    return this.accountId;
  }

  supportsEmailSubmission(): boolean {
    return this.hasCapability("urn:ietf:params:jmap:submission");
  }

  supportsQuota(): boolean {
    return this.hasCapability("urn:ietf:params:jmap:quota");
  }

  supportsVacationResponse(): boolean {
    return this.hasCapability("urn:ietf:params:jmap:vacationresponse");
  }

  async downloadBlob(blobId: string, name?: string, type?: string): Promise<void> {
    const url = this.getBlobDownloadUrl(blobId, name, type);

    const response = await fetch(url, {
      headers: {
        'Authorization': this.authHeader,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download attachment: ${response.status}`);
    }

    // Get the blob from the response
    const blob = await response.blob();

    // Create a temporary URL for the blob
    const blobUrl = URL.createObjectURL(blob);

    // Create a temporary anchor element and trigger download
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = name || 'download';
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  }

  // Real-time Updates via Polling (EventSource has auth limitations with Basic Auth)
  private pollingInterval: NodeJS.Timeout | null = null;
  private pollingStates: { [key: string]: string } = {};

  setupPushNotifications(): boolean {
    // Use polling instead of EventSource due to Basic Auth limitations
    // EventSource can't send Authorization headers, and URL-embedded credentials
    // get decoded by browsers, breaking auth for usernames/passwords with special chars

    // Initial state fetch
    this.fetchCurrentStates();

    // Set up polling interval
    this.pollingInterval = setInterval(() => {
      this.checkForStateChanges();
    }, 15000); // Poll every 15 seconds

    return true;
  }

  private async fetchCurrentStates(): Promise<void> {
    try {
      // Get current states from server using JMAP query
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.authHeader,
        },
        body: JSON.stringify({
          using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
          methodCalls: [
            ['Mailbox/get', { accountId: this.accountId, ids: null, properties: ['id'] }, 'a'],
            ['Email/get', { accountId: this.accountId, ids: [], properties: ['id'] }, 'b'],
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Extract states from response
        for (const [method, result] of data.methodResponses) {
          if (method === 'Mailbox/get' && result.state) {
            this.pollingStates['Mailbox'] = result.state;
          }
          if (method === 'Email/get' && result.state) {
            this.pollingStates['Email'] = result.state;
          }
        }
      }
    } catch {
      // Silently fail - polling will retry
    }
  }

  private async checkForStateChanges(): Promise<void> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.authHeader,
        },
        body: JSON.stringify({
          using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
          methodCalls: [
            ['Mailbox/get', { accountId: this.accountId, ids: null, properties: ['id'] }, 'a'],
            ['Email/get', { accountId: this.accountId, ids: [], properties: ['id'] }, 'b'],
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const changes: { [key: string]: string } = {};
        let hasChanges = false;

        for (const [method, result] of data.methodResponses) {
          if (method === 'Mailbox/get' && result.state) {
            if (this.pollingStates['Mailbox'] && this.pollingStates['Mailbox'] !== result.state) {
              changes['Mailbox'] = result.state;
              hasChanges = true;
            }
            this.pollingStates['Mailbox'] = result.state;
          }
          if (method === 'Email/get' && result.state) {
            if (this.pollingStates['Email'] && this.pollingStates['Email'] !== result.state) {
              changes['Email'] = result.state;
              hasChanges = true;
            }
            this.pollingStates['Email'] = result.state;
          }
        }

        if (hasChanges && this.stateChangeCallback) {
          this.stateChangeCallback({
            '@type': 'StateChange',
            changed: {
              [this.accountId]: changes,
            },
          });
        }
      }
    } catch {
      // Silently fail - polling will retry
    }
  }

  closePushNotifications(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.stateChangeCallback = null;
    this.pollingStates = {};
  }

  onStateChange(callback: (change: StateChange) => void): void {
    this.stateChangeCallback = callback;
  }

  getLastStates(): AccountStates {
    return { ...this.lastStates };
  }

  setLastStates(states: AccountStates): void {
    this.lastStates = { ...states };
  }

  // Contact management methods
  async getContacts(): Promise<Contact[]> {
    try {
      console.log('Getting all contacts for account:', this.accountId);
      const response = await this.request([
        ["ContactCard/get", {
          accountId: this.accountId,
          ids: null, // Get all contacts
        }, "0"],
      ]);

      if (response.methodResponses?.[0]?.[0] === "ContactCard/get") {
        const contactCards = response.methodResponses[0][1].list || [];
        console.log('Fetched contacts:', contactCards.length);
        return contactCards.map((card: any) => this.mapContactCardToContact(card));
      }

      return [];
    } catch (error) {
      console.error('Failed to get contacts:', error);
      return [];
    }
  }

  async getContact(contactId: string): Promise<Contact | null> {
    try {
      const response = await this.request([
        ["ContactCard/get", {
          accountId: this.accountId,
          ids: [contactId],
          properties: [
            "uid",
            "n",
            "fn",
            "email",
            "tel",
            "adr",
            "org",
            "title",
            "note",
            "photo",
            "categories",
            "created",
            "updated",
          ],
        }, "0"],
      ]);

      if (response.methodResponses?.[0]?.[0] === "ContactCard/get") {
        const contacts = response.methodResponses[0][1].list || [];
        if (contacts.length > 0) {
          return this.mapContactCardToContact(contacts[0]);
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to get contact:', error);
      return null;
    }
  }

  async createContact(contact: Omit<Contact, 'id'>): Promise<string> {
    try {
      const contactCard = this.mapContactToContactCard(contact);
      const contactId = `contact-${Date.now()}`;

      const response = await this.request([
        ["ContactCard/set", {
          accountId: this.accountId,
          create: {
            [contactId]: contactCard,
          },
        }, "0"],
      ]);

      if (response.methodResponses?.[0]?.[0] === "ContactCard/set") {
        const result = response.methodResponses[0][1];
        if (result.created?.[contactId]) {
          return result.created[contactId].id;
        }
      }

      throw new Error('Failed to create contact');
    } catch (error) {
      console.error('Failed to create contact:', error);
      throw error;
    }
  }

  async updateContact(contactId: string, contact: Partial<Contact>): Promise<void> {
    try {
      const contactCard = this.mapContactToContactCard(contact as Contact);

      await this.request([
        ["ContactCard/set", {
          accountId: this.accountId,
          update: {
            [contactId]: contactCard,
          },
        }, "0"],
      ]);
    } catch (error) {
      console.error('Failed to update contact:', error);
      throw error;
    }
  }

  async deleteContact(contactId: string): Promise<void> {
    try {
      await this.request([
        ["ContactCard/set", {
          accountId: this.accountId,
          destroy: [contactId],
        }, "0"],
      ]);
    } catch (error) {
      console.error('Failed to delete contact:', error);
      throw error;
    }
  }

  private mapContactCardToContact(card: any): Contact {
    // JSContact format from Stalwart
    const fullName = card.name?.full || card.fn || '';
    const nameComponents = card.name?.components || [];
    
    let firstName = '';
    let lastName = '';
    
    for (const component of nameComponents) {
      if (component.kind === 'given') firstName = component.value;
      if (component.kind === 'surname') lastName = component.value;
    }

    const emails: Contact['emails'] = [];
    if (card.emails) {
      Object.entries(card.emails).forEach(([, emailData]: [string, any]) => {
        emails.push({
          type: emailData.contexts?.work ? 'work' : emailData.contexts?.home ? 'home' : 'other',
          email: emailData.address,
        });
      });
    }

    const phones: Contact['phones'] = [];
    if (card.phones) {
      Object.entries(card.phones).forEach(([, phoneData]: [string, any]) => {
        phones.push({
          type: phoneData.contexts?.mobile ? 'mobile' : phoneData.contexts?.work ? 'work' : phoneData.contexts?.home ? 'home' : 'other',
          number: phoneData.number,
        });
      });
    }

    const addresses: Contact['addresses'] = [];
    if (card.addresses) {
      Object.entries(card.addresses).forEach(([, addressData]: [string, any]) => {
        addresses.push({
          type: addressData.contexts?.work ? 'work' : addressData.contexts?.home ? 'home' : 'other',
          street: addressData.street || addressData.full?.split('\n')[0] || '',
          city: addressData.locality || '',
          region: addressData.region || '',
          postcode: addressData.postcode || '',
          country: addressData.country || '',
        });
      });
    }

    return {
      id: card.id || card.uid || '',
      uid: card.uid || '',
      name: fullName || `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      emails,
      phones,
      addresses,
      organization: card.organizations?.[0]?.name || '',
      jobTitle: card.titles?.[0]?.title || '',
      notes: card.notes?.[0]?.note || '',
      avatar: card.photos?.[0]?.url || '',
      categories: card.categories || [],
      createdAt: new Date(card.created || 0).toISOString(),
      updatedAt: new Date(card.updated || 0).toISOString(),
    };
  }

  private mapContactToContactCard(contact: Partial<Contact>): Record<string, any> {
    // Convert to JSContact format for Stalwart
    const card: Record<string, any> = {
      version: '1.0',
      kind: 'individual',
    };

    if (contact.name) {
      card.fn = contact.name;
      
      const components = [];
      if (contact.lastName) components.push({ kind: 'surname', value: contact.lastName });
      if (contact.firstName) components.push({ kind: 'given', value: contact.firstName });
      
      if (components.length > 0) {
        card.name = { 
          full: contact.name,
          components 
        };
      }
    }

    if (contact.emails && contact.emails.length > 0) {
      card.emails = {};
      contact.emails.forEach((email, idx) => {
        card.emails[`email-${idx}`] = {
          address: email.email,
          contexts: email.type !== 'other' ? { [email.type as string]: true } : {},
        };
      });
    }

    if (contact.phones && contact.phones.length > 0) {
      card.phones = {};
      contact.phones.forEach((phone, idx) => {
        card.phones[`phone-${idx}`] = {
          number: phone.number,
          contexts: phone.type !== 'other' ? { [phone.type as string]: true } : {},
        };
      });
    }

    if (contact.addresses && contact.addresses.length > 0) {
      card.addresses = {};
      contact.addresses.forEach((address, idx) => {
        card.addresses[`address-${idx}`] = {
          street: address.street,
          locality: address.city,
          region: address.region,
          postcode: address.postcode,
          country: address.country,
          contexts: address.type !== 'other' ? { [address.type as string]: true } : {},
        };
      });
    }

    if (contact.organization) {
      card.organizations = [{ name: contact.organization }];
    }

    if (contact.jobTitle) {
      card.titles = [{ title: contact.jobTitle }];
    }

    if (contact.notes) {
      card.notes = [{ note: contact.notes }];
    }

    if (contact.avatar) {
      card.photos = [{ url: contact.avatar }];
    }

    if (contact.categories && contact.categories.length > 0) {
      card.categories = contact.categories;
    }

    return card;
  }

  // Email Alias Management Methods
  // These methods manage email aliases for the account

  async getAliases(): Promise<any[]> {
    try {
      // Note: This assumes the server supports a custom "Alias/get" method
      // or uses Identity objects to represent aliases
      // Stalwart Mail Server may use Identity objects for this purpose
      const response = await this.request([
        ["Identity/get", {
          accountId: this.accountId,
        }, "0"]
      ]);

      if (response.methodResponses?.[0]?.[0] === "Identity/get") {
        const identities = response.methodResponses[0][1].list || [];
        // Filter to get only aliases (non-primary identities)
        return identities.filter((identity: any) => !identity.isPrimary);
      }

      return [];
    } catch (error) {
      console.error('Failed to get aliases:', error);
      return [];
    }
  }

  async createAlias(email: string, displayName?: string): Promise<string> {
    try {
      // Create a new identity as an alias
      const aliasId = `alias-${Date.now()}`;
      
      const response = await this.request([
        ["Identity/set", {
          accountId: this.accountId,
          create: {
            [aliasId]: {
              email: email,
              name: displayName || email.split('@')[0],
              mayDelete: true,
            },
          },
        }, "0"]
      ]);

      if (response.methodResponses?.[0]?.[0] === "Identity/set") {
        const result = response.methodResponses[0][1];
        if (result.created?.[aliasId]) {
          return result.created[aliasId].id;
        }
      }

      throw new Error('Failed to create alias');
    } catch (error) {
      console.error('Failed to create alias:', error);
      throw error;
    }
  }

  async updateAlias(aliasId: string, updates: { email?: string; name?: string }): Promise<void> {
    try {
      await this.request([
        ["Identity/set", {
          accountId: this.accountId,
          update: {
            [aliasId]: updates,
          },
        }, "0"]
      ]);
    } catch (error) {
      console.error('Failed to update alias:', error);
      throw error;
    }
  }

  async deleteAlias(aliasId: string): Promise<void> {
    try {
      await this.request([
        ["Identity/set", {
          accountId: this.accountId,
          destroy: [aliasId],
        }, "0"]
      ]);
    } catch (error) {
      console.error('Failed to delete alias:', error);
      throw error;
    }
  }

  async setAliasForwarding(aliasId: string, forwardTo: string[]): Promise<void> {
    try {
      // This would require server-side support for forwarding rules
      // Implementation depends on server capabilities
      await this.request([
        ["Identity/set", {
          accountId: this.accountId,
          update: {
            [aliasId]: {
              bcc: forwardTo.map(email => ({ email })),
            },
          },
        }, "0"]
      ]);
    } catch (error) {
      console.error('Failed to set alias forwarding:', error);
      throw error;
    }
  }

  async getAliasUsageStats(aliasId: string): Promise<{ sent: number; received: number } | null> {
    try {
      // Query emails sent from and received on the alias
      const sentResponse = await this.request([
        ["Email/query", {
          accountId: this.accountId,
          filter: {
            from: { email: aliasId },
          },
        }, "0"]
      ]);

      const receivedResponse = await this.request([
        ["Email/query", {
          accountId: this.accountId,
          filter: {
            to: { email: aliasId },
          },
        }, "1"]
      ]);

      const sent = sentResponse.methodResponses?.[0]?.[1]?.total || 0;
      const received = receivedResponse.methodResponses?.[1]?.[1]?.total || 0;

      return { sent, received };
    } catch (error) {
      console.error('Failed to get alias usage stats:', error);
      return null;
    }
  }

  async validateAliasEmail(email: string): Promise<boolean> {
    try {
      // Check if email format is valid
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return false;
      }

      // Check if alias already exists
      const aliases = await this.getAliases();
      const exists = aliases.some((alias: any) => alias.email === email);
      
      return !exists;
    } catch (error) {
      console.error('Failed to validate alias email:', error);
      return false;
    }
  }

  async getAliasCapabilities(): Promise<{
    supportsAliases: boolean;
    maxAliasesPerAccount?: number;
    supportsForwarding: boolean;
    supportsVisibility: boolean;
  }> {
    try {
      // Check server capabilities for alias support
      const capabilities = this.getCapabilities();
      
      return {
        supportsAliases: this.hasCapability("urn:ietf:params:jmap:mail"),
        supportsForwarding: this.hasCapability("urn:ietf:params:jmap:mail"),
        supportsVisibility: true, // Can be controlled via display name
      };
    } catch (error) {
      console.error('Failed to get alias capabilities:', error);
      return {
        supportsAliases: false,
        supportsForwarding: false,
        supportsVisibility: false,
      };
    }
  }

  // Calendar methods (RFC 8984 - JMAP Calendars)
  async getCalendars(): Promise<Calendar[]> {
    try {
      const response = await this.request([
        ["Calendar/get", {
          accountId: this.accountId,
        }, "0"]
      ]);

      if (response.methodResponses?.[0]?.[0] === "Calendar/get") {
        const calendars = (response.methodResponses[0][1].list || []) as Calendar[];
        return calendars;
      }

      return [];
    } catch (error) {
      console.error('Failed to get calendars:', error);
      return [];
    }
  }

  async getCalendar(calendarId: string): Promise<Calendar | null> {
    try {
      const response = await this.request([
        ["Calendar/get", {
          accountId: this.accountId,
          ids: [calendarId],
        }, "0"]
      ]);

      if (response.methodResponses?.[0]?.[0] === "Calendar/get") {
        const calendars = response.methodResponses[0][1].list || [];
        return calendars[0] || null;
      }

      return null;
    } catch (error) {
      console.error('Failed to get calendar:', error);
      return null;
    }
  }

  async createCalendar(name: string, description?: string, color?: string): Promise<string> {
    try {
      const calendarId = `calendar-${Date.now()}`;

      const response = await this.request([
        ["Calendar/set", {
          accountId: this.accountId,
          create: {
            [calendarId]: {
              name: name,
              description: description,
              color: color,
            },
          },
        }, "0"]
      ]);

      if (response.methodResponses?.[0]?.[0] === "Calendar/set") {
        const result = response.methodResponses[0][1];
        if (result.created?.[calendarId]) {
          return result.created[calendarId].id;
        }
      }

      throw new Error('Failed to create calendar');
    } catch (error) {
      console.error('Failed to create calendar:', error);
      throw error;
    }
  }

  async updateCalendar(calendarId: string, updates: Partial<Calendar>): Promise<void> {
    try {
      await this.request([
        ["Calendar/set", {
          accountId: this.accountId,
          update: {
            [calendarId]: updates,
          },
        }, "0"]
      ]);
    } catch (error) {
      console.error('Failed to update calendar:', error);
      throw error;
    }
  }

  async deleteCalendar(calendarId: string): Promise<void> {
    try {
      await this.request([
        ["Calendar/set", {
          accountId: this.accountId,
          destroy: [calendarId],
        }, "0"]
      ]);
    } catch (error) {
      console.error('Failed to delete calendar:', error);
      throw error;
    }
  }

  async getCalendarEvents(calendarId: string, limit: number = 1000, position: number = 0): Promise<{ events: CalendarEvent[], hasMore: boolean, total: number }> {
    try {
      console.log(`[JMAP] Fetching events for calendar: ${calendarId}`);
      
      // Get calendar account ID using the calendar capability  
      const calendarCapability = 'urn:ietf:params:jmap:calendars';
      const calendarAccountId = this.getAccountIdForCapability(calendarCapability);
      
      if (!calendarAccountId) {
        console.error('[JMAP] No calendar account ID found');
        return { events: [], hasMore: false, total: 0 };
      }

      console.log(`[JMAP] Using calendar account ID: ${calendarAccountId}`);

      // Build date range filter for the current month
      // Stalwart doesn't support calendarIds filter, so we'll filter client-side
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      const filter = {
        after: monthStart.toISOString(),
        before: monthEnd.toISOString(),
      };

      console.log(`[JMAP] Using filter:`, filter);

      // Query with date range filter first
      let response = await this.request([
        ["CalendarEvent/query", {
          accountId: calendarAccountId,
          filter: filter,
          sort: [{ property: "start", isAscending: true }],
          limit: limit,
          position: position,
        }, "0"],
        ["CalendarEvent/get", {
          accountId: calendarAccountId,
          "#ids": {
            resultOf: "0",
            name: "CalendarEvent/query",
            path: "/ids",
          },
          properties: [
            "id",
            "calendarId",
            "calendarIds",
            "title",
            "description",
            "location",
            "start",
            "end",
            "duration",
            "timeZone",
            "showWithoutTime",
            "recurrenceRules",
            "participants",
            "priority",
            "freeBusyStatus",
            "privacy",
            "created",
            "updated",
          ],
        }, "1"],
      ]);

      const queryResponse = response.methodResponses?.[0];
      const getResponse = response.methodResponses?.[1];

      if (!queryResponse || !getResponse) {
        console.error(`[JMAP] Invalid response for calendar ${calendarId}:`, response);
        return { events: [], hasMore: false, total: 0 };
      }

      const [queryMethod, queryData] = queryResponse;
      const [getMethod, getData] = getResponse;

      console.log(`[JMAP] Query method: ${queryMethod}`);
      console.log(`[JMAP] Get method: ${getMethod}`);

      // Check for query errors
      if (queryMethod === "error") {
        console.error('[JMAP] CalendarEvent/query error:', queryData);
        
        // If unsupported filter, retry with empty filter
        if (queryData?.type === 'unsupportedFilter') {
          console.warn('[JMAP] Date filter unsupported, retrying with empty filter');
          return await this.getCalendarEventsWithEmptyFilter(calendarAccountId, calendarId, limit, position);
        }
        
        return { events: [], hasMore: false, total: 0 };
      }

      if (queryMethod !== "CalendarEvent/query") {
        console.error(`[JMAP] Expected CalendarEvent/query, got ${queryMethod}`);
        return { events: [], hasMore: false, total: 0 };
      }

      console.log(`[JMAP] Query returned ${queryData?.ids?.length || 0} event IDs`);

      // Check for get errors
      if (getMethod === "error") {
        console.error('[JMAP] CalendarEvent/get error:', getData);
        return { events: [], hasMore: false, total: 0 };
      }

      if (getMethod !== "CalendarEvent/get") {
        console.error(`[JMAP] Expected CalendarEvent/get, got ${getMethod}`);
        return { events: [], hasMore: false, total: 0 };
      }

      // Get raw events from response
      const rawEvents = getData.list || [];
      console.log(`[JMAP] Retrieved ${rawEvents.length} events from server`);
      if (rawEvents.length > 0) {
        console.log(`[JMAP] First event structure:`, JSON.stringify(rawEvents[0], null, 2));
      }
      
      // Filter events to only include those from the requested calendar (client-side filtering)
      const calendarIdSet = new Set([calendarId]);
      const filteredEvents = rawEvents.filter((event: any) => {
        // Check for calendarIds object format (RFC 8984 format: { "id1": true, "id2": false })
        if (event.calendarIds && typeof event.calendarIds === 'object' && !Array.isArray(event.calendarIds)) {
          const eventCalendarIds = Object.keys(event.calendarIds).filter(key => event.calendarIds[key] === true);
          const matches = eventCalendarIds.some(id => calendarIdSet.has(id));
          if (matches) {
            console.log(`[JMAP] Event ${event.id} matches via calendarIds:`, eventCalendarIds);
          }
          return matches;
        }
        // Check for calendarId (singular) format
        if (event.calendarId) {
          const matches = calendarIdSet.has(event.calendarId);
          if (matches) {
            console.log(`[JMAP] Event ${event.id} matches via calendarId: ${event.calendarId}`);
          }
          return matches;
        }
        // If no calendar info, don't include it
        console.log(`[JMAP] Event ${event.id} has no calendar info - skipping`);
        return false;
      });
      
      console.log(`[JMAP] Filtered to ${filteredEvents.length} events for calendar ${calendarId}`);

      // Map JMAP events to our interface
      const events = filteredEvents.map((event: any) => this.mapJMAPEventToCalendarEvent(event, calendarId));
      const total = queryData.total || 0;
      const hasMore = total > 0
        ? (position + events.length) < total
        : false;

      console.log(`[JMAP] Returning ${events.length} events from ${total} total for calendar ${calendarId}`);
      return { events, hasMore, total };
    } catch (error) {
      console.error(`[JMAP] Failed to get calendar events for ${calendarId}:`, error);
      return { events: [], hasMore: false, total: 0 };
    }
  }

  private async getCalendarEventsWithEmptyFilter(
    calendarAccountId: string,
    calendarId: string,
    limit: number = 1000,
    position: number = 0
  ): Promise<{ events: CalendarEvent[], hasMore: boolean, total: number }> {
    try {
      console.log(`[JMAP] Retrying with empty filter for calendar ${calendarId}`);
      
      // Retry with empty filter
      const response = await this.request([
        ["CalendarEvent/query", {
          accountId: calendarAccountId,
          filter: {},
          sort: [{ property: "start", isAscending: true }],
          limit: limit,
          position: position,
        }, "0"],
        ["CalendarEvent/get", {
          accountId: calendarAccountId,
          "#ids": {
            resultOf: "0",
            name: "CalendarEvent/query",
            path: "/ids",
          },
          properties: [
            "id",
            "calendarId",
            "calendarIds",
            "title",
            "description",
            "location",
            "start",
            "end",
            "duration",
            "timeZone",
            "showWithoutTime",
            "recurrenceRules",
            "participants",
            "priority",
            "freeBusyStatus",
            "privacy",
            "created",
            "updated",
          ],
        }, "1"],
      ]);

      const queryResponse = response.methodResponses?.[0];
      const getResponse = response.methodResponses?.[1];

      if (!queryResponse || !getResponse) {
        console.error(`[JMAP] Invalid response for calendar ${calendarId} (empty filter retry):`, response);
        return { events: [], hasMore: false, total: 0 };
      }

      const [queryMethod, queryData] = queryResponse;
      const [getMethod, getData] = getResponse;

      // Check for query errors
      if (queryMethod === "error") {
        console.error('[JMAP] CalendarEvent/query error (empty filter retry):', queryData);
        return { events: [], hasMore: false, total: 0 };
      }

      if (queryMethod !== "CalendarEvent/query") {
        console.error(`[JMAP] Expected CalendarEvent/query, got ${queryMethod}`);
        return { events: [], hasMore: false, total: 0 };
      }

      // Check for get errors
      if (getMethod === "error") {
        console.error('[JMAP] CalendarEvent/get error (empty filter retry):', getData);
        return { events: [], hasMore: false, total: 0 };
      }

      if (getMethod !== "CalendarEvent/get") {
        console.error(`[JMAP] Expected CalendarEvent/get, got ${getMethod}`);
        return { events: [], hasMore: false, total: 0 };
      }

      // Get raw events from response
      const rawEvents = getData.list || [];
      console.log(`[JMAP] Retrieved ${rawEvents.length} events from server (empty filter)`);
      
      // Filter events to only include those from the requested calendar (client-side filtering)
      const calendarIdSet = new Set([calendarId]);
      const filteredEvents = rawEvents.filter((event: any) => {
        // Check for calendarIds object format (RFC 8984 format: { "id1": true, "id2": false })
        if (event.calendarIds && typeof event.calendarIds === 'object' && !Array.isArray(event.calendarIds)) {
          const eventCalendarIds = Object.keys(event.calendarIds).filter(key => event.calendarIds[key] === true);
          return eventCalendarIds.some(id => calendarIdSet.has(id));
        }
        // Check for calendarId (singular) format
        if (event.calendarId) {
          return calendarIdSet.has(event.calendarId);
        }
        // If no calendar info, don't include it
        return false;
      });
      
      console.log(`[JMAP] Filtered to ${filteredEvents.length} events for calendar ${calendarId} (empty filter)`);

      // Map JMAP events to our interface
      const events = filteredEvents.map((event: any) => this.mapJMAPEventToCalendarEvent(event, calendarId));
      const total = queryData.total || 0;
      const hasMore = total > 0
        ? (position + events.length) < total
        : false;

      console.log(`[JMAP] Returning ${events.length} events from ${total} total for calendar ${calendarId} (empty filter)`);
      return { events, hasMore, total };
    } catch (error) {
      console.error(`[JMAP] Failed to get calendar events with empty filter for ${calendarId}:`, error);
      return { events: [], hasMore: false, total: 0 };
    }
  }

  async getCalendarEventsWithoutQuery(
    calendarId: string,
    limit: number = 50,
    position: number = 0
  ): Promise<{ events: CalendarEvent[]; hasMore: boolean; total: number }> {
    try {
      console.log(`Attempting fallback event fetch for ${calendarId} without references...`);
      
      // Try two separate requests without using references
      // Note: We don't use calendar filters as some servers don't support them
      const response = await this.request([
        ["CalendarEvent/query", {
          accountId: this.accountId,
          filter: {},
          sort: [{ property: "start", isAscending: true }],
          limit: limit,
          position: position,
        }, "0"],
      ]);

      const queryResponse = response.methodResponses?.[0];
      
      if (!queryResponse) {
        console.error(`No response from CalendarEvent/query fallback for ${calendarId}`);
        return { events: [], hasMore: false, total: 0 };
      }

      const [queryMethod, queryData] = queryResponse;
      
      if (queryMethod === "error") {
        console.error(`CalendarEvent/query error for ${calendarId}:`, queryData);
        console.log(`Error type: ${queryData.type}, Error message: ${queryData.description}`);
        // Try simple fetch as fallback
        console.log(`Trying simple CalendarEvent/get without query...`);
        return await this.getCalendarEventsSimple(calendarId);
      }

      if (queryMethod !== "CalendarEvent/query") {
        console.error(`Expected CalendarEvent/query in fallback, got ${queryMethod}`);
        return { events: [], hasMore: false, total: 0 };
      }

      // Now fetch the events using the IDs we got from the query
      if (!queryData.ids || queryData.ids.length === 0) {
        console.log(`No events found for calendar ${calendarId}`);
        return { events: [], hasMore: false, total: 0 };
      }

      const getResponse = await this.request([
        ["CalendarEvent/get", {
          accountId: this.accountId,
          ids: queryData.ids,
          properties: [
            "id",
            "calendarId",
            "title",
            "description",
            "location",
            "start",
            "end",
            "startTime",
            "endTime",
            "duration",
            "isAllDay",
            "timeZone",
            "timezone",
            "recurrence",
            "recurrenceRules",
            "recurrenceId",
            "status",
            "transparency",
            "isPrivate",
            "organizer",
            "participants",
            "categories",
            "priority",
            "attachments",
            "alarm",
            "created",
            "updated",
          ],
        }, "0"],
      ]);

      const getMethodResponse = getResponse.methodResponses?.[0];
      
      if (!getMethodResponse) {
        console.error(`No response from CalendarEvent/get fallback for ${calendarId}`);
        return { events: [], hasMore: false, total: 0 };
      }

      const [getMethod, getData] = getMethodResponse;

      if (getMethod === "error") {
        console.error(`CalendarEvent/get error in fallback for ${calendarId}:`, getData);
        return { events: [], hasMore: false, total: 0 };
      }

      if (getMethod !== "CalendarEvent/get") {
        console.error(`Expected CalendarEvent/get in fallback, got ${getMethod}`);
        return { events: [], hasMore: false, total: 0 };
      }

      const rawEvents = getData.list || [];
      // Filter events to only include those from the requested calendar (client-side filtering)
      const filteredEvents = rawEvents.filter((event: any) => {
        // Check for calendarIds object format (RFC 8984 format)
        if (event.calendarIds && typeof event.calendarIds === 'object' && !Array.isArray(event.calendarIds)) {
          const eventCalendarIds = Object.keys(event.calendarIds).filter(key => event.calendarIds[key] === true);
          return eventCalendarIds.includes(calendarId);
        }
        // Check for calendarId (singular) format
        if (event.calendarId) {
          return event.calendarId === calendarId;
        }
        // Fallback: if neither property exists, include it
        return true;
      });
      const events = filteredEvents.map((event: any) => this.mapJMAPEventToCalendarEvent(event));
      const total = queryData.total || 0;
      const hasMore = total > 0
        ? (position + events.length) < total
        : false;

      console.log(`Fallback: Got ${events.length} events from ${total} total for calendar ${calendarId}`);
      return { events, hasMore, total };
    } catch (error) {
      console.error(`Fallback event fetch failed for ${calendarId}:`, error);
      return { events: [], hasMore: false, total: 0 };
    }
  }

  async getCalendarEventsSimple(calendarId: string): Promise<{ events: CalendarEvent[]; hasMore: boolean; total: number }> {
    try {
      console.log(`Attempting simple calendar event fetch for ${calendarId}...`);
      
      // Just try to get a small batch of events directly
      // Some JMAP servers might not support the advanced query
      const response = await this.request([
        ["CalendarEvent/get", {
          accountId: this.accountId,
          properties: [
            "id",
            "calendarId",
            "title",
            "description",
            "location",
            "start",
            "end",
            "startTime",
            "endTime",
            "duration",
            "isAllDay",
            "timeZone",
            "timezone",
            "recurrence",
            "recurrenceRules",
            "recurrenceId",
            "status",
            "transparency",
            "isPrivate",
            "organizer",
            "participants",
            "categories",
            "priority",
            "attachments",
            "alarm",
            "created",
            "updated",
          ],
        }, "0"],
      ]);

      const methodResponse = response.methodResponses?.[0];
      
      if (!methodResponse) {
        console.error(`No response from simple CalendarEvent/get for ${calendarId}`);
        return { events: [], hasMore: false, total: 0 };
      }

      const [method, data] = methodResponse;

      if (method === "error") {
        console.error(`CalendarEvent/get simple fetch error for ${calendarId}:`, data);
        return { events: [], hasMore: false, total: 0 };
      }

      if (method !== "CalendarEvent/get") {
        console.error(`Expected CalendarEvent/get in simple fetch, got ${method}`);
        return { events: [], hasMore: false, total: 0 };
      }

      const rawEvents = data.list || [];
      // Filter events to only include those from the requested calendar (client-side filtering)
      const filteredEvents = rawEvents.filter((event: any) => {
        // Check for calendarIds object format (RFC 8984 format)
        if (event.calendarIds && typeof event.calendarIds === 'object' && !Array.isArray(event.calendarIds)) {
          const eventCalendarIds = Object.keys(event.calendarIds).filter(key => event.calendarIds[key] === true);
          return eventCalendarIds.includes(calendarId);
        }
        // Check for calendarId (singular) format
        if (event.calendarId) {
          return event.calendarId === calendarId;
        }
        // Fallback: if neither property exists, include it
        return true;
      });
      const events = filteredEvents.map((event: any) => this.mapJMAPEventToCalendarEvent(event));

      console.log(`Simple fetch: Got ${events.length} events for calendar ${calendarId}`);
      return { events, hasMore: false, total: events.length };
    } catch (error) {
      console.error(`Simple calendar event fetch failed for ${calendarId}:`, error);
      return { events: [], hasMore: false, total: 0 };
    }
  }

  async getCalendarEvent(eventId: string): Promise<CalendarEvent | null> {
    try {
      const response = await this.request([
        ["CalendarEvent/get", {
          accountId: this.accountId,
          ids: [eventId],
          properties: [
            "id",
            "calendarId",
            "title",
            "description",
            "location",
            "start",
            "end",
            "startTime",
            "endTime",
            "duration",
            "isAllDay",
            "timeZone",
            "timezone",
            "recurrence",
            "recurrenceRules",
            "recurrenceId",
            "status",
            "transparency",
            "isPrivate",
            "organizer",
            "participants",
            "categories",
            "priority",
            "attachments",
            "alarm",
            "created",
            "updated",
          ],
        }, "0"]
      ]);

      if (response.methodResponses?.[0]?.[0] === "CalendarEvent/get") {
        const events = response.methodResponses[0][1].list || [];
        const rawEvent = events[0];
        if (rawEvent) {
          return this.mapJMAPEventToCalendarEvent(rawEvent);
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to get calendar event:', error);
      return null;
    }
  }

  async createCalendarEvent(calendarId: string, event: Omit<CalendarEvent, 'id' | 'calendarId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const eventId = `event-${Date.now()}`;
      
      // Convert interface format to RFC 8984 JMAP format
      // Interface uses startTime/endTime, JMAP uses start/duration
      let start = event.startTime;
      let duration = 'PT0S'; // default zero duration
      
      if (event.startTime && event.endTime) {
        // Calculate duration from start and end times
        const startDate = new Date(event.startTime);
        const endDate = new Date(event.endTime);
        const diffMs = endDate.getTime() - startDate.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        
        // Convert to ISO 8601 duration format
        const hours = Math.floor(diffSecs / 3600);
        const minutes = Math.floor((diffSecs % 3600) / 60);
        const seconds = diffSecs % 60;
        
        let durationStr = 'P';
        if (hours >= 24) {
          durationStr += `${Math.floor(hours / 24)}D`;
          duration = durationStr + (hours % 24 > 0 || minutes > 0 || seconds > 0 
            ? `T${(hours % 24)}H${minutes}M${seconds}S` 
            : '');
        } else {
          durationStr += `T${hours}H${minutes}M${seconds}S`;
          duration = durationStr;
        }
      } else if (event.endTime && !event.startTime) {
        start = event.endTime;
      }
      
      // Ensure event has proper RFC 8984 format
      const eventData: any = {
        '@type': 'Event',
        uid: `uid-${eventId}`,
        title: event.title || '',
        start: start || new Date().toISOString(),
        duration: duration,
        ...(event.description && { description: event.description }),
        // Note: location is not supported by Stalwart's JMAP implementation
        ...(event.isAllDay && { showWithoutTime: event.isAllDay }),
        ...(event.timezone && { timeZone: event.timezone }),
        // Assign to calendar
        calendarIds: { [calendarId]: true },
      };

      const response = await this.request([
        ["CalendarEvent/set", {
          accountId: this.accountId,
          create: {
            [eventId]: eventData,
          },
        }, "0"]
      ]);

      if (response.methodResponses?.[0]?.[0] === "CalendarEvent/set") {
        const result = response.methodResponses[0][1];
        if (result.created?.[eventId]) {
          const createdEvent = result.created[eventId];
          return createdEvent.id || eventId;
        }
        // Log what went wrong
        console.warn('CalendarEvent/set response:', result);
        if (result.notCreated) {
          const error = result.notCreated[eventId];
          console.error('Event creation error details:', error);
          const invalidProps = error?.properties?.join(', ') || 'unknown';
          throw new Error(`Failed to create calendar event: ${error?.type || 'Unknown error'} - Invalid properties: ${invalidProps}`);
        }
      }

      throw new Error(`Failed to create calendar event: Invalid response - ${response.methodResponses?.[0]?.[0] || 'No response'}`);
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      throw error;
    }
  }

  async updateCalendarEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<void> {
    try {
      // Convert interface format to RFC 8984 JMAP format
      const jmapUpdates: any = {};
      
      if (updates.title !== undefined) jmapUpdates.title = updates.title;
      if (updates.description !== undefined) jmapUpdates.description = updates.description;
      if (updates.location !== undefined) jmapUpdates.location = updates.location;
      if (updates.isAllDay !== undefined) jmapUpdates.showWithoutTime = updates.isAllDay;
      if (updates.timezone !== undefined) jmapUpdates.timeZone = updates.timezone;
      
      // Handle start/duration conversion
      if (updates.startTime !== undefined || updates.endTime !== undefined) {
        if (updates.startTime) {
          jmapUpdates.start = updates.startTime;
        }
        if (updates.startTime && updates.endTime) {
          const startDate = new Date(updates.startTime);
          const endDate = new Date(updates.endTime);
          const diffMs = endDate.getTime() - startDate.getTime();
          const diffSecs = Math.floor(diffMs / 1000);
          
          const hours = Math.floor(diffSecs / 3600);
          const minutes = Math.floor((diffSecs % 3600) / 60);
          const seconds = diffSecs % 60;
          
          let durationStr = 'P';
          if (hours >= 24) {
            durationStr += `${Math.floor(hours / 24)}D`;
            jmapUpdates.duration = durationStr + (hours % 24 > 0 || minutes > 0 || seconds > 0 
              ? `T${(hours % 24)}H${minutes}M${seconds}S` 
              : '');
          } else {
            durationStr += `T${hours}H${minutes}M${seconds}S`;
            jmapUpdates.duration = durationStr;
          }
        }
      }
      
      await this.request([
        ["CalendarEvent/set", {
          accountId: this.accountId,
          update: {
            [eventId]: jmapUpdates,
          },
        }, "0"]
      ]);
    } catch (error) {
      console.error('Failed to update calendar event:', error);
      throw error;
    }
  }

  async deleteCalendarEvent(eventId: string): Promise<void> {
    try {
      await this.request([
        ["CalendarEvent/set", {
          accountId: this.accountId,
          destroy: [eventId],
        }, "0"]
      ]);
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      throw error;
    }
  }

  async updateCalendarEventParticipantStatus(eventId: string, participantEmail: string, status: 'accepted' | 'declined' | 'tentative' | 'needs-action'): Promise<void> {
    try {
      // Get the current event
      const event = await this.getCalendarEvent(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Update participant status
      const updatedParticipants = (event.participants || []).map(p => {
        if (p.email === participantEmail) {
          return { ...p, status };
        }
        return p;
      });

      // Update the event
      await this.updateCalendarEvent(eventId, {
        participants: updatedParticipants,
      });
    } catch (error) {
      console.error('Failed to update participant status:', error);
      throw error;
    }
  }

  async getCalendarEventsByDateRange(calendarId: string, startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    try {
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();

      const response = await this.request([
        ["CalendarEvent/query", {
          accountId: this.accountId,
          filter: {
            inCalendars: [calendarId],
            before: endISO,
            after: startISO,
          },
          sort: [{ property: "startTime", isAscending: true }],
        }, "0"],
        ["CalendarEvent/get", {
          accountId: this.accountId,
          "#ids": {
            resultOf: "0",
            name: "CalendarEvent/query",
            path: "/ids",
          },
          properties: [
            "id",
            "calendarId",
            "title",
            "description",
            "location",
            "start",
            "end",
            "startTime",
            "endTime",
            "duration",
            "isAllDay",
            "timeZone",
            "timezone",
            "recurrence",
            "recurrenceRules",
            "recurrenceId",
            "status",
            "transparency",
            "isPrivate",
            "organizer",
            "participants",
            "categories",
            "priority",
            "attachments",
            "alarm",
            "created",
            "updated",
          ],
        }, "1"],
      ]);

      if (response.methodResponses?.[1]?.[0] === "CalendarEvent/get") {
        const rawEvents = response.methodResponses[1][1].list || [];
        const events = rawEvents.map((event: any) => this.mapJMAPEventToCalendarEvent(event));
        return events;
      }

      return [];
    } catch (error) {
      console.error('Failed to get calendar events by date range:', error);
      return [];
    }
  }

  supportsCalendars(): boolean {
    return this.hasCapability("urn:ietf:params:jmap:calendars");
  }
}