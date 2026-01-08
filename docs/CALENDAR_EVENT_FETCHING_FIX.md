# Calendar Event Fetching Fix

## Issue
The calendar was not displaying all events from the calendar. Events were being fetched but not properly displayed in the calendar views.

## Root Cause
The issue was in the event visibility management. The calendar component was initializing `selectedCalendarIds` on mount, but the `updateVisibleEvents()` function wasn't being called at the right time to filter and display the events properly.

## Solution

### 1. Enhanced useEffect Hooks in CalendarView Component
Updated the initialization logic to properly handle calendar selection and event visibility:

```typescript
// Initialize selected calendars on mount and sync events
useEffect(() => {
  if (calendars.length > 0) {
    if (selectedCalendarIds.size === 0) {
      // First time: select all calendars
      setSelectedCalendars(calendars.map((c) => c.id));
    } else {
      // Update visible events whenever calendars or events change
      updateVisibleEvents();
    }
  }
}, [calendars, selectedCalendarIds, setSelectedCalendars, updateVisibleEvents]);

// Ensure visible events are updated when events change
useEffect(() => {
  if (events.length > 0) {
    updateVisibleEvents();
  }
}, [events, updateVisibleEvents]);
```

### 2. Event Filtering Logic
The `updateVisibleEvents()` function in the calendar store properly filters events:

```typescript
updateVisibleEvents: () => {
  const state = get();
  const visible = state.selectedCalendarIds.size === 0
    ? state.events
    : state.events.filter((event) =>
        state.selectedCalendarIds.has(event.calendarId)
      );
  set({ visibleEvents: visible });
},
```

### 3. Using visibleEvents in Views
All calendar views now use `visibleEvents` instead of `events`:

- **Month View**: Uses `getEventsForDate()` which filters from `visibleEvents`
- **Week View**: Uses `getEventsForDate()` which filters from `visibleEvents`
- **Day View**: Uses `getEventsForDate()` which filters from `visibleEvents`
- **Agenda View**: Directly uses `visibleEvents` sorted chronologically

## Data Flow

1. **Initialization**
   - Component mounts
   - Calendar store loads calendars and events via `syncCalendars()`
   - `selectedCalendarIds` is empty initially

2. **Calendar Selection**
   - First useEffect detects `calendars.length > 0` and `selectedCalendarIds.size === 0`
   - Calls `setSelectedCalendars()` with all calendar IDs
   - This triggers `updateVisibleEvents()`

3. **Event Display**
   - `visibleEvents` is now populated with all events from selected calendars
   - All views use `visibleEvents` to display events
   - When user toggles calendar visibility, `updateVisibleEvents()` is called again

4. **Event Updates**
   - When events are created, updated, or deleted, the store updates the `events` array
   - Second useEffect detects `events.length > 0` and calls `updateVisibleEvents()`
   - `visibleEvents` is updated and views re-render

## Key Changes

### File: `components/calendar/calendar-view.tsx`
- Improved useEffect hooks for proper initialization
- Separated calendar selection logic from event visibility updates
- Added explicit event update trigger

### File: `stores/calendar-store.ts`
- Already had proper `updateVisibleEvents()` implementation
- No changes needed - the fix was in the component

## Testing

The fix ensures:
- ✓ All events from all selected calendars are displayed
- ✓ Events are properly filtered when calendars are toggled
- ✓ New events appear immediately after creation
- ✓ Deleted events are removed from display
- ✓ All view modes (month, week, day, agenda) show all events

## Build Status
✓ Successfully compiled without errors
✓ All TypeScript checks passed
✓ Production build optimized

## Verification

To verify the fix is working:
1. Navigate to the calendar page
2. Check that all events from all calendars are displayed
3. Toggle calendar visibility checkboxes
4. Verify events are filtered correctly
5. Create a new event and verify it appears immediately
6. Delete an event and verify it's removed from display
