# Calendar Event Fetching - Error Response Issue

## Problem Statement
The calendar implementation successfully fetches **calendars** but fails to fetch **events**. The JMAP server returns an error response instead of the expected `CalendarEvent/query` result.

## Error Details
```
Console Error: "Expected CalendarEvent/query, got error"
Location: lib/jmap/client.ts:2193
Response Structure: methodResponses[0] = ["error", {type, description, ...}]
```

## Root Cause
When the JMAP client calls `CalendarEvent/query` with a reference to `CalendarEvent/get` results, the server rejects it with an error. This typically happens when:

1. **Server doesn't support `CalendarEvent/query` references** - Some JMAP servers may not support the advanced reference syntax
2. **Namespace not properly enabled** - The `urn:ietf:params:jmap:calendars` capability might not be fully supported
3. **Query syntax error** - The query parameters might be malformed for that specific server

## Solution Implemented

### 1. Enhanced Error Logging
Modified `lib/jmap/client.ts` in the `getCalendarEvents()` method to:
- Log the actual error details from the server
- Show error type and description
- Capture the full error object for debugging

```typescript
if (queryMethod !== "CalendarEvent/query") {
  console.error(`Expected CalendarEvent/query, got ${queryMethod}`);
  console.error(`Query error details:`, queryData);
  // Fallback: try to fetch events without using query references
  return await this.getCalendarEventsWithoutQuery(calendarId, limit, position);
}
```

### 2. Fallback Method: `getCalendarEventsWithoutQuery()`
A two-step approach that avoids using references:
1. Makes a separate `CalendarEvent/query` request (no references)
2. Gets the IDs from the query result
3. Makes a separate `CalendarEvent/get` request using those IDs

Benefits:
- Doesn't rely on reference support
- Shows specific error for each step
- Handles both query and get errors gracefully

### 3. Simple Fallback: `getCalendarEventsSimple()`
If both methods fail, tries a basic `CalendarEvent/get` without any filtering:
- No query, no references
- May return all events (limited by server pagination)
- Useful for very basic JMAP implementations

## How to Debug

### 1. Check Server Capabilities
Visit the debug page and check if the server actually advertises calendar support:
- Navigate to `/debug-calendar`
- Click "Check Capabilities" button
- Check browser console for the response

### 2. Manual Event Fetch
On the debug page:
1. Click "Manual Fetch" to trigger direct API calls
2. Watch the console for detailed logs:
   - Calendar fetch success/failure
   - Event query success/failure
   - Error details if failures occur

### 3. Console Logs
All JMAP operations now log detailed information:
```
Calendar event response for [calendarId]: {...}
Query error details: {type: "unknownMethod", description: "..."}
Attempting fallback event fetch for [calendarId] without query...
Fallback: Got 5 events from 10 total for [calendarId]
```

## Expected Error Types
If you see error responses, they might be:

```
type: "unknownMethod"  → Server doesn't support CalendarEvent/query
type: "invalidMethod"  → Query syntax is wrong
type: "accountNotFound" → JMAP account ID is incorrect
type: "forbidden" → User doesn't have permission
type: "serverFail" → Temporary server error
```

## Implementation Details

### Files Modified
1. **lib/jmap/client.ts**
   - Enhanced `getCalendarEvents()` with better error handling
   - Added `getCalendarEventsWithoutQuery()` fallback
   - Added `getCalendarEventsSimple()` basic fallback
   - Improved error logging with details

2. **app/[locale]/debug-calendar/page.tsx**
   - Added "Check Capabilities" button
   - Improved state display
   - Enhanced logging capabilities

3. **app/[locale]/api/debug-capabilities/route.ts** (New)
   - Debug endpoint for capability checking
   - Currently returns basic info; can be enhanced

### Code Flow
```
getCalendarEvents() [Original method with references]
  ↓
  If query fails with error response:
    → getCalendarEventsWithoutQuery() [Two-step without references]
      ↓
      If still fails with unknownMethod/invalidMethod:
        → getCalendarEventsSimple() [Basic fetch without query]
```

## Next Steps

1. **Test the implementation**
   - Run calendar sync
   - Check browser console for error details
   - Note the specific error type

2. **Based on error type, adjust approach:**
   - `unknownMethod` → Server doesn't support CalendarEvent/query, use simple method
   - `invalidMethod` → Adjust query syntax for that server
   - `forbidden` → Check account permissions
   - Other → Check server logs

3. **Monitor logs**
   - Use debug page to manually test
   - Check all three fallback methods are working
   - Verify data is being returned correctly

## Property Mapping
Events are mapped from JMAP format to the application interface format using `mapJMAPEventToCalendarEvent()`:
- JMAP: `start`, `end`, `timeZone`
- Interface: `startTime`, `endTime`, `timezone`
- Duration is converted from ISO 8601 to seconds
- All JMAP properties are requested to maximize compatibility

## Testing Checklist
- [ ] Build passes (`npm run build`)
- [ ] No TypeScript errors
- [ ] Visit debug-calendar page
- [ ] Check browser console during sync
- [ ] Note actual error type from server
- [ ] Verify fallback methods are being called
- [ ] Confirm events appear if fallback succeeds
