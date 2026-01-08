# JMAP Calendar Implementation Guide

This document describes the JMAP Calendar implementation for JMAP Webmail, following RFC 8984 (JMAP Calendars).

## Overview

The calendar functionality provides full CRUD operations for calendars and calendar events, with support for:
- Multiple calendars per account
- Calendar events with recurrence rules
- Participant management and RSVP tracking
- Event attachments and alarms
- Date range queries
- Real-time synchronization

## Architecture

### JMAP Client Methods

The [`JMAPClient`](../lib/jmap/client.ts) class provides the following calendar methods:

#### Calendar Operations

**`getCalendars(): Promise<Calendar[]>`**
- Fetches all calendars for the account
- Returns array of Calendar objects

**`getCalendar(calendarId: string): Promise<Calendar | null>`**
- Fetches a specific calendar by ID
- Returns Calendar object or null if not found

**`createCalendar(name: string, description?: string, color?: string): Promise<string>`**
- Creates a new calendar
- Returns the ID of the created calendar

**`updateCalendar(calendarId: string, updates: Partial<Calendar>): Promise<void>`**
- Updates calendar properties (name, description, color, etc.)
- Throws error if update fails

**`deleteCalendar(calendarId: string): Promise<void>`**
- Deletes a calendar and all its events
- Throws error if deletion fails

#### Calendar Event Operations

**`getCalendarEvents(calendarId: string, limit?: number, position?: number): Promise<{ events: CalendarEvent[], hasMore: boolean, total: number }>`**
- Fetches events for a specific calendar with pagination
- Default limit: 50 events per page
- Returns paginated results

**`getCalendarEvent(eventId: string): Promise<CalendarEvent | null>`**
- Fetches a specific event by ID
- Returns CalendarEvent object or null if not found

**`createCalendarEvent(calendarId: string, event: Omit<CalendarEvent, 'id' | 'calendarId' | 'createdAt' | 'updatedAt'>): Promise<string>`**
- Creates a new event in the specified calendar
- Returns the ID of the created event

**`updateCalendarEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<void>`**
- Updates event properties
- Throws error if update fails

**`deleteCalendarEvent(eventId: string): Promise<void>`**
- Deletes an event
- Throws error if deletion fails

**`updateCalendarEventParticipantStatus(eventId: string, participantEmail: string, status: 'accepted' | 'declined' | 'tentative' | 'needs-action'): Promise<void>`**
- Updates RSVP status for a participant
- Throws error if update fails

**`getCalendarEventsByDateRange(calendarId: string, startDate: Date, endDate: Date): Promise<CalendarEvent[]>`**
- Fetches all events within a date range
- Useful for calendar views (month, week, day)

**`supportsCalendars(): boolean`**
- Checks if the server supports JMAP Calendars capability
- Returns true if "urn:ietf:params:jmap:calendars" is in capabilities

### State Management

The [`useCalendarStore`](../stores/calendar-store.ts) Zustand store manages calendar state:

```typescript
interface CalendarStore {
  // State
  calendars: Calendar[];
  events: CalendarEvent[];
  selectedCalendarId: string | null;
  selectedEventId: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  viewMode: 'month' | 'week' | 'day';
  selectedDate: Date;
  supportsCalendars: boolean;
  lastSyncTime: number | null;

  // Calendar operations
  fetchCalendars: (client: JMAPClient) => Promise<void>;
  createCalendar: (client: JMAPClient, calendar: Omit<Calendar, 'id'>) => Promise<void>;
  updateCalendar: (client: JMAPClient, calendarId: string, updates: Partial<Calendar>) => Promise<void>;
  deleteCalendar: (client: JMAPClient, calendarId: string) => Promise<void>;
  selectCalendar: (calendarId: string | null) => void;

  // Event operations
  fetchEvents: (client: JMAPClient, calendarId?: string) => Promise<void>;
  getEventsForDate: (date: Date) => CalendarEvent[];
  getEventsForDateRange: (startDate: Date, endDate: Date) => CalendarEvent[];
  createEvent: (client: JMAPClient, event: Omit<CalendarEvent, 'id'>) => Promise<void>;
  updateEvent: (client: JMAPClient, eventId: string, updates: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (client: JMAPClient, eventId: string) => Promise<void>;
  selectEvent: (eventId: string | null) => void;

  // Sync operations
  initializeSync: (client: JMAPClient) => Promise<void>;
  syncCalendars: (client: JMAPClient) => Promise<void>;
  handleCalendarChange: (calendarIds: string[], client: JMAPClient) => Promise<void>;

  // View operations
  setViewMode: (mode: 'month' | 'week' | 'day') => void;
  setSelectedDate: (date: Date) => void;

  // UI state
  clearError: () => void;
}
```

### Type Definitions

Calendar types are defined in [`lib/jmap/types.ts`](../lib/jmap/types.ts):

**`Calendar`**
```typescript
interface Calendar {
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
```

**`CalendarEvent`**
```typescript
interface CalendarEvent {
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
  recurrenceId?: string;
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
  priority?: number;
  attachments?: CalendarEventAttachment[];
  alarm?: {
    action: 'display' | 'email' | 'procedure';
    trigger: string; // ISO 8601 duration
  };
  
  createdAt?: string;
  updatedAt?: string;
}
```

**`RecurrenceRule`**
```typescript
interface RecurrenceRule {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;
  count?: number;
  until?: string; // ISO 8601 date
  byDay?: string[]; // MO, TU, WE, etc.
  byMonth?: number[]; // 1-12
  byMonthDay?: number[];
}
```

**`CalendarEventParticipant`**
```typescript
interface CalendarEventParticipant {
  name?: string;
  email: string;
  status?: 'accepted' | 'declined' | 'tentative' | 'needs-action';
  role?: 'chair' | 'req-participant' | 'opt-participant' | 'non-participant';
}
```

## Usage Examples

### Fetching Calendars

```typescript
import { useCalendarStore } from '@/stores/calendar-store';
import { useAuthStore } from '@/stores/auth-store';

function CalendarList() {
  const { calendars, fetchCalendars } = useCalendarStore();
  const { client } = useAuthStore();

  useEffect(() => {
    if (client) {
      fetchCalendars(client);
    }
  }, [client, fetchCalendars]);

  return (
    <ul>
      {calendars.map(cal => (
        <li key={cal.id}>{cal.name}</li>
      ))}
    </ul>
  );
}
```

### Creating an Event

```typescript
async function createEvent() {
  const { createEvent, selectedCalendarId } = useCalendarStore();
  const { client } = useAuthStore();

  if (!client || !selectedCalendarId) return;

  await createEvent(client, {
    calendarId: selectedCalendarId,
    title: 'Team Meeting',
    description: 'Weekly sync',
    location: 'Conference Room A',
    startTime: new Date(2024, 0, 15, 10, 0).toISOString(),
    endTime: new Date(2024, 0, 15, 11, 0).toISOString(),
    participants: [
      { email: 'alice@example.com', status: 'needs-action' },
      { email: 'bob@example.com', status: 'needs-action' },
    ],
  });
}
```

### Fetching Events for a Date Range

```typescript
function MonthView() {
  const { getEventsForDateRange } = useCalendarStore();
  const [startDate, setStartDate] = useState(new Date(2024, 0, 1));
  const [endDate, setEndDate] = useState(new Date(2024, 0, 31));

  const events = getEventsForDateRange(startDate, endDate);

  return (
    <div>
      {events.map(event => (
        <div key={event.id}>
          <h3>{event.title}</h3>
          <p>{new Date(event.startTime).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
```

### Updating Event Participant Status

```typescript
async function respondToInvite(eventId: string, status: 'accepted' | 'declined') {
  const { updateEvent } = useCalendarStore();
  const { client } = useAuthStore();

  if (!client) return;

  await client.updateCalendarEventParticipantStatus(
    eventId,
    'user@example.com',
    status
  );
}
```

### Syncing Calendars

```typescript
function CalendarSync() {
  const { syncCalendars, isSyncing, lastSyncTime } = useCalendarStore();
  const { client } = useAuthStore();

  const handleSync = async () => {
    if (client) {
      await syncCalendars(client);
    }
  };

  return (
    <div>
      <button onClick={handleSync} disabled={isSyncing}>
        {isSyncing ? 'Syncing...' : 'Sync Calendars'}
      </button>
      {lastSyncTime && (
        <p>Last synced: {new Date(lastSyncTime).toLocaleString()}</p>
      )}
    </div>
  );
}
```

## JMAP Protocol Details

### Calendar/get

Fetches calendar objects:

```json
{
  "using": ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:calendars"],
  "methodCalls": [
    ["Calendar/get", {
      "accountId": "account-id",
      "ids": null
    }, "0"]
  ]
}
```

### CalendarEvent/query

Queries calendar events with filters:

```json
{
  "using": ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:calendars"],
  "methodCalls": [
    ["CalendarEvent/query", {
      "accountId": "account-id",
      "filter": {
        "inCalendars": ["calendar-id"],
        "before": "2024-02-01T00:00:00Z",
        "after": "2024-01-01T00:00:00Z"
      },
      "sort": [{ "property": "startTime", "isAscending": true }],
      "limit": 50
    }, "0"]
  ]
}
```

### CalendarEvent/set

Creates, updates, or deletes events:

```json
{
  "using": ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:calendars"],
  "methodCalls": [
    ["CalendarEvent/set", {
      "accountId": "account-id",
      "create": {
        "event-1": {
          "calendarId": "calendar-id",
          "title": "Meeting",
          "startTime": "2024-01-15T10:00:00Z",
          "endTime": "2024-01-15T11:00:00Z"
        }
      }
    }, "0"]
  ]
}
```

## Server Capability Detection

The implementation checks for calendar support:

```typescript
const supportsCalendars = client.supportsCalendars();
// or
const capabilities = client.getCapabilities();
const hasCalendars = "urn:ietf:params:jmap:calendars" in capabilities;
```

## Error Handling

All calendar operations include error handling:

```typescript
try {
  await createEvent(client, eventData);
} catch (error) {
  console.error('Failed to create event:', error);
  // Error is stored in store.error
}
```

## Performance Considerations

1. **Pagination**: Events are fetched with pagination (default 50 per page)
2. **Caching**: Calendar store persists view mode and selected date
3. **Batch Operations**: Multiple calendars are synced in parallel
4. **Date Range Queries**: Use `getCalendarEventsByDateRange()` for efficient filtering

## Limitations

1. **Server Support**: Requires JMAP server with calendar support (RFC 8984)
2. **Recurrence**: Complex recurrence rules may have limited support depending on server
3. **Timezones**: Timezone handling depends on server implementation
4. **Attachments**: File size limits depend on server configuration

## Testing

To test calendar functionality:

1. Ensure JMAP server supports calendars capability
2. Create test calendars and events
3. Verify CRUD operations work correctly
4. Test date range queries
5. Test participant status updates
6. Test synchronization

## Future Enhancements

- [ ] Calendar sharing and delegation
- [ ] Recurring event expansion
- [ ] Calendar color customization UI
- [ ] Event reminders and notifications
- [ ] Calendar import/export (iCal format)
- [ ] Conflict detection
- [ ] Calendar subscriptions
