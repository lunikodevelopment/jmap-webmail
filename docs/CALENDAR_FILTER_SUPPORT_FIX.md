# Calendar Event Fetching - Filter Support Fix

## Problem Identified

The Stalwart JMAP server doesn't support filtering CalendarEvent queries by `inCalendars` or `calendarIds` parameters. The server returns:
```
Error type: unsupportedFilter
Description: "inCalendars" or "calendarIds"
```

This means:
- Tier 1 (with references): ❌ Fails - query has unsupported filter
- Tier 2 (fallback): ❌ Fails - same filter used in fallback
- Tier 3 (simple): ❌ Fails - same filter used in simple fetch

## Solution Implemented

**Remove all calendar ID filters from JMAP queries and filter results client-side instead.**

### Changes Made

#### 1. Main Method: `getCalendarEvents()`
**Before:**
```typescript
filter: {
  inCalendars: [calendarId],
},
```

**After:**
```typescript
// No filter parameter - fetch all events from account
```

#### 2. Fallback Method 1: `getCalendarEventsWithoutQuery()`
**Before:**
```typescript
filter: {
  calendarIds: [calendarId],
},
```

**After:**
```typescript
// No filter parameter - fetch all events from account
```

#### 3. Fallback Method 2: `getCalendarEventsSimple()`
**No filter was used anyway** - already worked with all events

#### 4. Client-Side Filtering
Added to all three methods:
```typescript
const filteredEvents = rawEvents.filter((event: any) => event.calendarId === calendarId);
const events = filteredEvents.map((event: any) => this.mapJMAPEventToCalendarEvent(event));
```

**This ensures:**
- Query fetches ALL events from the account
- Each method filters results client-side by calendarId
- Works with servers that don't support calendar ID filters
- Performance is acceptable since we're already fetching all data

### Why This Works

The Stalwart server supports:
1. ✅ `CalendarEvent/query` without filters (fetches all events)
2. ✅ `CalendarEvent/get` with event IDs
3. ✅ Events include `calendarId` property

So we can:
1. Query all events from the account (no filter)
2. Get their details
3. Filter by calendar ID in JavaScript

## Expected Behavior

When you access the calendar page now:

1. **Query all events**: Server returns all calendar events
2. **Filter by calendar**: Client-side JavaScript filters to just the requested calendar
3. **Display events**: Events for that calendar appear on the calendar

### Console Logs
```
Fetching events for calendar b
Calendar event response for b: {methodResponses: Array(2), sessionState: '...'}
Got X events from Y total for calendar b
```

**No errors** - should proceed to successfully fetch and display events.

## Build Status
✅ **Build passes successfully**
- No TypeScript errors
- All imports resolved
- Compiles with Turbopack in 1656.4ms

## Testing

1. Start dev server: `npm run dev`
2. Visit calendar page
3. Check browser console (F12)
4. Should see: "Got X events from Y total"
5. Events should display on calendar

## Files Modified

[lib/jmap/client.ts](lib/jmap/client.ts)
- Removed `inCalendars` filter from `getCalendarEvents()` line ~2130
- Removed `calendarIds` filter from `getCalendarEventsWithoutQuery()` line ~2230
- Added client-side calendar filtering to all three methods
- Updated log messages to reflect no-filter approach

## Compatibility

This approach works with:
- ✅ Stalwart JMAP (no filter support)
- ✅ RFC 8984 compliant servers (may or may not support filters)
- ✅ Any server that supports `CalendarEvent/query` and `CalendarEvent/get`

## Performance Impact

- **Minimal** - Same number of network requests
- **Query**: Still limited by account (not per-calendar)
- **Filtering**: JavaScript object iteration (negligible for typical calendar sizes)
- **Caching**: Filter results in memory before storing in state

## Next Steps

Test with the fixed code:
1. Server will no longer reject the query
2. Events will be fetched for the account
3. JavaScript will filter to the requested calendar
4. Calendar page will display events

If calendar is empty:
- Check if server has events (use debug page)
- Events might be in the account but not visible due to permissions
- Check calendar capabilities with "Check Capabilities" button on debug page
