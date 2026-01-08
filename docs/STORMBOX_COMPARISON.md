# Stormbox Vue vs JMAP-Webmail Next.js Comparison

## Overview
The Stormbox repository is a working Vue 3 + Vite implementation of a JMAP email client that successfully handles calendar functionality. The current JMAP-Webmail is a Next.js + React implementation with similar goals but different architecture.

## Key Differences

### Architecture
| Aspect | Stormbox (Vue) | JMAP-Webmail (Next.js) |
|--------|---|---|
| **Framework** | Vue 3 (Composition API) | Next.js 16 + React 19 |
| **Build Tool** | Vite | Next.js Turbopack |
| **Styling** | CSS variables | Tailwind CSS 4 |
| **State Management** | Composables (useCalendarStore) | Zustand |
| **Internationalization** | Built-in | next-intl |
| **Authentication** | Custom auth in composables | NextAuth v4 |

### JMAP Calendar Implementation

#### Vue Version (Stormbox) - WORKING ✅
**File Structure:**
- `src/composables/useCalendarStore.js` - Central state management
- `src/services/jmap.js` - JMAP service methods (lines 2224-2665)
- `src/components/CalendarView.vue` - UI component
- `src/components/EventEditor.vue` - Event creation/editing

**Key Methods:**
```javascript
// Service Layer
listCalendars()  // Uses Calendar/get with no filter
getEvents(calendarIds, start, end)  // CalendarEvent/query + CalendarEvent/get
createEvent(calendarId, eventData)  // JSCalendar format with calendarIds object
updateEvent(calendarId, eventId, updates)
deleteEvent(calendarId, eventId)

// State Management
refreshCalendars()
refreshEvents()
createEvent()
updateEvent()
deleteEvent()
navigateDate()
toggleCalendar()
```

**Critical Implementation Details:**
1. **Event Format**: Uses JSCalendar format with `calendarIds` as object format: `{ "calendarId": true }`
2. **Duration Format**: ISO 8601 format (e.g., "PT1H30M")
3. **Date Handling**: ISO strings for startTime/endTime
4. **JMAP Namespace**: Uses `urn:ietf:params:jmap:calendars` (RFC 8984)
5. **View Modes**: Month, Week, Day, Agenda
6. **State**: Calendars, events, selectedCalendarIds, currentDate, viewMode, eventEditorOpen

#### Next.js Version (JMAP-Webmail) - IMPLEMENTED ✓
**File Structure:**
- `stores/calendar-store.ts` - Zustand state management
- `lib/jmap/client.ts` - JMAP client methods (lines 1961-2325)
- `components/calendar/calendar-view.tsx` - UI component
- `app/[locale]/calendar/page.tsx` - Calendar page

**Key Methods:**
```typescript
// Service Layer (JMAPClient)
getCalendars()  // Calendar/get
getCalendarEvents(calendarId, limit, position)  // CalendarEvent/query + CalendarEvent/get
getCalendarEvent(eventId)  // Single event fetch
getCalendarEventsByDateRange(calendarId, startDate, endDate)
createCalendarEvent(calendarId, event)
updateCalendarEvent(eventId, updates)
deleteCalendarEvent(eventId)
supportsCalendars()  // Capability check

// State Management (Zustand Store)
fetchCalendars()
createCalendar()
updateCalendar()
deleteCalendar()
fetchEvents()
getEventsForDate()
getEventsForDateRange()
createEvent()
updateEvent()
deleteEvent()
initializeSync()
syncCalendars()
handleCalendarChange()
```

**Similar Implementation Details:**
1. **Event Format**: CalendarEvent type with similar structure
2. **JMAP Namespace**: Uses `urn:ietf:params:jmap:calendars` (RFC 8984)
3. **Date Handling**: ISO strings
4. **View Modes**: Month, Week, Day, Agenda
5. **State**: Calendars, events, selectedCalendarIds, selectedDate, viewMode

## What Works in Stormbox ✅

1. **Calendar Synchronization**
   - Successfully fetches calendars from JMAP server
   - Properly detects server capabilities
   - Handles Calendar/get requests correctly

2. **Event Management**
   - Fetches events with proper query filters
   - Supports date range queries
   - Creates, updates, and deletes events
   - Handles JSCalendar format correctly

3. **UI Integration**
   - Multiple view modes (month, week, day, agenda)
   - Calendar visibility toggles
   - Event creation/editing modals
   - Context menus for event actions

4. **Account Provider Pattern**
   - Initializes stores with provide/inject
   - Passes client context to child components
   - Manages tab switching (Mail, Contacts, Calendar)

## Potential Issues in JMAP-Webmail

Based on comparing with the working Stormbox implementation, look for:

1. **Event Data Format**
   - Ensure `calendarId` field is properly formatted in event objects
   - Verify duration format (should be ISO 8601 like "PT1H30M")

2. **Store Initialization**
   - Check `initializeSync()` is called with proper capabilities check
   - Verify `supportsCalendars` is set before attempting calendar operations

3. **JMAP Request Format**
   - Ensure `using` array includes `"urn:ietf:params:jmap:calendars"`
   - Verify `accountId` is correctly set in all requests

4. **Event Fetching**
   - Check that `visibleEvents` are properly filtered from full events list
   - Ensure date range queries use proper ISO format filters

5. **Component Integration**
   - Verify calendar store is properly initialized on page mount
   - Check that client instance is passed correctly to store methods
   - Ensure error handling doesn't silently fail

## Recommendations

1. **Reference Stormbox Test Files**
   - Use `test-calendars.js` from Stormbox as validation reference
   - Test calendar fetch flow end-to-end

2. **Verify JSCalendar Compliance**
   - Ensure all event properties follow JSCalendar specification
   - Test event creation with all supported properties

3. **Debug Step-by-step**
   - Enable console logging in calendar methods
   - Verify each JMAP request/response matches RFC 8984
   - Check AccountId and calendar IDs in responses

4. **View Mode Implementation**
   - Ensure all view modes properly filter events by date
   - Check that navigation updates selectedDate correctly
   - Verify calendar visibility toggles affect visibleEvents

## File References

**Stormbox Working Implementation:**
- https://github.com/luna-dj/stormbox/tree/main
- Key files: src/composables/useCalendarStore.js, src/services/jmap.js

**JMAP-Webmail Current Implementation:**
- [stores/calendar-store.ts](stores/calendar-store.ts)
- [lib/jmap/client.ts](lib/jmap/client.ts) (lines 1961-2325)
- [app/[locale]/calendar/page.tsx](app/[locale]/calendar/page.tsx)
- [components/calendar/calendar-view.tsx](components/calendar/calendar-view.tsx)
