# Calendar Event Fetching - Debug Guide

## Issue Identified

Events are not being fetched from the JMAP server during calendar synchronization.

## Root Causes to Check

### 1. **Response Format Issue**
The `CalendarEvent/query` and `CalendarEvent/get` responses might not match expected format.

**Solution**: Enhanced logging added to `getCalendarEvents()` method to show actual response structure.

### 2. **Filter Issue**
The `inCalendars` filter might not be working with the calendar ID format from your server.

**Check**: Verify calendar IDs are strings like "b" or "cal-123"

### 3. **Method Response Ordering**
The reference (`#ids`) might not be resolving correctly.

**Check**: Look at response in Network tab to see if IDs are populated

### 4. **Empty Calendar**
The calendar might simply have no events.

**Check**: Create an event manually first, then sync

## How to Debug

### Step 1: Open Debug Page
```
http://localhost:3000/[your-locale]/debug-calendar
```

This page shows:
- Store state (calendars, events, sync status)
- List of all calendars
- List of all events
- Manual refresh and fetch buttons
- Error messages

### Step 2: Check Console Logs

Open browser DevTools (F12) → Console tab. You should see:

```
Initializing calendar sync with client: JMAPClient
Server supports JMAP Calendars, initializing sync...
Starting calendar sync...
Fetched calendars: [...]
Fetching events for calendar: b (Calendar Name)
Fetching events for calendar b
Calendar event response for b: {...}
Got X events from Y total for calendar b
```

### Step 3: Check Network Requests

1. Open DevTools → Network tab
2. Filter for `/api/jmap` or just watch for POST requests
3. Look for requests with:
   - Method: `CalendarEvent/query`
   - Method: `CalendarEvent/get`

4. Check the response:
   ```json
   {
     "methodResponses": [
       ["CalendarEvent/query", {
         "accountId": "...",
         "ids": ["event-id-1", "event-id-2"],
         "total": 2
       }, "0"],
       ["CalendarEvent/get", {
         "accountId": "...",
         "list": [
           {
             "id": "event-id-1",
             "title": "Event Title",
             ...
           }
         ]
       }, "1"]
     ]
   }
   ```

### Step 4: Verify Calendar IDs

The calendar IDs from the server must match what's in the filter.

**Check**: Run this in console:
```javascript
import { useCalendarStore } from '@/stores/calendar-store'
const store = useCalendarStore.getState()
console.log('Calendar IDs:', store.calendars.map(c => ({ id: c.id, name: c.name })))
```

### Step 5: Test Event Fetch Directly

In browser console:
```javascript
import { useAuthStore } from '@/stores/auth-store'
const { client } = useAuthStore.getState()

// Get calendars
const cals = await client.getCalendars()
console.log('Calendars:', cals)

// Test fetch for first calendar
if (cals.length > 0) {
  const result = await client.getCalendarEvents(cals[0].id)
  console.log('Events:', result)
}
```

## Common Issues & Solutions

### Issue: "CalendarEvent/query is not a supported method"
**Cause**: Server doesn't support calendar queries
**Solution**: Check if `supportsCalendars()` returns true

### Issue: Empty events list but calendar exists
**Cause**: 
1. Calendar is empty
2. Filter format is wrong
3. Server doesn't return events with query

**Solution**: 
1. Create event manually first
2. Check calendar ID format matches

### Issue: Response shows error in methodResponse
**Cause**: JMAP request format is incorrect
**Solution**: Check Network tab response for error message, share in logs

### Issue: "#ids" reference not working
**Cause**: Some servers don't support references
**Solution**: Need to implement fallback without references

**If this is your issue, I can implement a fallback method that queries without references.**

## Enhanced Event Fetching (Fallback Method)

If the reference-based method doesn't work, we need this fallback:

```typescript
async getCalendarEventsWithoutReferences(calendarId: string): Promise<CalendarEvent[]> {
  try {
    // First get all event IDs
    const queryResponse = await this.request([
      ["CalendarEvent/query", {
        accountId: this.accountId,
        filter: {
          inCalendars: [calendarId],
        },
      }, "0"]
    ]);

    const eventIds = queryResponse.methodResponses?.[0]?.[1]?.ids || [];
    
    if (eventIds.length === 0) {
      return [];
    }

    // Then fetch events separately
    const getResponse = await this.request([
      ["CalendarEvent/get", {
        accountId: this.accountId,
        ids: eventIds,
        properties: [/* all properties */],
      }, "0"]
    ]);

    return getResponse.methodResponses?.[0]?.[1]?.list || [];
  } catch (error) {
    console.error('Failed to get events:', error);
    return [];
  }
}
```

## Quick Checklist

- [ ] Calendar page loads
- [ ] Console shows "Server supports JMAP Calendars..."
- [ ] Console shows "Fetched calendars: [...]"
- [ ] Calendars appear in sidebar (debug page)
- [ ] Console shows "Fetching events for calendar..."
- [ ] Console shows actual event response
- [ ] Events appear in Events list (debug page)
- [ ] Events appear on calendar view

## Next Steps

1. **Go to debug page**: `http://localhost:3000/[locale]/debug-calendar`
2. **Check Store State** section - should show calendars
3. **Look at Console** - should show sync logs
4. **Click "Log to Console"** - check full store state
5. **Open Network tab** - check JMAP request/response format
6. **Share console logs** if events still don't appear

## Important: Check Calendar ID Format

Your server might use different calendar ID formats:
- Stalwart: Usually "b" or simple strings
- Some servers: "calendar-uuid-format"
- Others: numeric IDs

The debug page will show you exactly what IDs your server returns.

## To Test Event Creation Works

Even if fetch doesn't work, creating an event will tell us if the calendar is accessible:

1. Go to regular calendar page
2. Click "New Event"
3. Fill in details
4. Save

If this works, the calendar is accessible. Then we know the issue is specifically with event fetching.
