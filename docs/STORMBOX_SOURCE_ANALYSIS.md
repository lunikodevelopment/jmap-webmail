# Stormbox Source Code Analysis & Implementation Update

## Key Finding from Stormbox Source Code

After analyzing the working Stormbox Vue implementation (`/home/luna/stormbox-1/src/services/jmap.js`), we discovered the server uses **RFC 8984 compliant format** where:

- Events have `calendarIds` as an **object/map**, not a singular property
- Example: `{ calendarId: { "id1": true, "id2": false } }`
- The filter the server doesn't support is not the method itself, but the **filter parameter format**

## Changes Made to jmap-webmail-1

### 1. Enhanced Client-Side Filtering Logic

**Added support for both property formats:**

```typescript
// Check for calendarIds object format (RFC 8984 format)
if (event.calendarIds && typeof event.calendarIds === 'object' && !Array.isArray(event.calendarIds)) {
  const eventCalendarIds = Object.keys(event.calendarIds)
    .filter(key => event.calendarIds[key] === true);
  return eventCalendarIds.includes(calendarId);
}

// Check for calendarId (singular) format
if (event.calendarId) {
  return event.calendarId === calendarId;
}

// Fallback
return true;
```

**Applied to all three methods:**
- `getCalendarEvents()` - main method
- `getCalendarEventsWithoutQuery()` - fallback 1
- `getCalendarEventsSimple()` - fallback 2

### 2. Updated Event Mapper

**Enhanced `mapJMAPEventToCalendarEvent()` to extract calendarId:**

```typescript
// Handle calendarId - could be single value or calendarIds object
let calendarId = jmapEvent.calendarId;
if (!calendarId && jmapEvent.calendarIds && typeof jmapEvent.calendarIds === 'object' && !Array.isArray(jmapEvent.calendarIds)) {
  // Extract first calendar ID from calendarIds object
  const calendarIds = Object.keys(jmapEvent.calendarIds)
    .filter(key => jmapEvent.calendarIds[key] === true);
  calendarId = calendarIds[0] || 'unknown';
}
```

### 3. Added Enhanced Logging

**In `getCalendarEvents()` method:**
- Logs raw event count
- Shows first event structure for debugging
- Displays all event keys to identify property names

```typescript
console.log(`Raw events returned: ${rawEvents.length}`);
if (rawEvents.length > 0) {
  console.log(`First event structure:`, rawEvents[0]);
  console.log(`Event keys:`, Object.keys(rawEvents[0]));
}
```

## RFC 8984 Compliance

The updated code now fully supports RFC 8984 (JMAP Calendar Extensions) which specifies:
- Calendar events belong to one or more calendars
- `calendarIds` property is an object with keys = calendar IDs, values = boolean
- Some servers implement this strictly, others use simplified format

## Testing Expectations

With these changes:

1. **Query executes successfully** (no filter errors)
2. **Server returns all account events** (unfiltered)
3. **Client-side filtering** determines which calendar each event belongs to
4. **Debug logs show** actual event structure

## What to Look For in Console Logs

```
Raw events returned: X
First event structure: {
  id: "...",
  calendarIds: { "b": true },  ← This is the format
  title: "...",
  start: "...",
  ...
}
Event keys: ["id", "calendarIds", "calendarId", ...]
```

## Comparison with Stormbox

| Aspect | Stormbox | jmap-webmail-1 |
|--------|----------|----------------|
| Query filter | None (all events) | None (all events) |
| calendarIds format | Object/map | Object/map |
| Client-side filtering | ✅ Yes | ✅ Yes (now) |
| Fallback methods | ✅ Yes | ✅ Yes |
| Enhanced logging | ✅ Yes | ✅ Yes (now) |

## Build Status
✅ **Build passes** - Compiles in 1631.9ms with no TypeScript errors

## Next Step
Run the dev server and check console logs to see actual event structure returned by the server.
