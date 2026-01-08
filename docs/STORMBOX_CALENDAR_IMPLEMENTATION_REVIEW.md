# Stormbox Calendar Implementation Review

## Overview
The stormbox repository (https://github.com/luna-dj/stormbox) contains a comprehensive calendar implementation in Vue 3 with TypeScript. The main calendar component is located at `src/components/CalendarView.vue`.

## Architecture

### Component: CalendarView.vue (769 lines)
A full-featured calendar component built with Vue 3 Composition API that provides multiple view modes and event management capabilities.

## Key Features

### 1. **Multiple View Modes**
- **Month View**: Full month calendar grid with week layout
- **Week View**: Week-based view with date range display
- **Day View**: Single day view
- **Agenda View**: List-based event view (fallback for week/day modes)

### 2. **Calendar Management**
- Multiple calendar support with visibility toggles
- Calendar color coding for visual distinction
- Calendar selection and filtering
- Loading states for calendar data

### 3. **Event Management**
- Create new events
- Edit existing events
- Delete events with confirmation
- Event selection and highlighting
- Context menu for event actions
- Event display with:
  - Title
  - Start time
  - Location
  - Description
  - Calendar color indicator

### 4. **Navigation**
- Previous/Next month/week/day navigation
- "Go to Today" button for quick navigation
- Current date highlighting
- Date range display in header

### 5. **User Interactions**
- Click to select events
- Right-click context menu for event actions
- Keyboard shortcuts support (global key handling)
- Calendar toggle checkboxes
- View mode switching buttons

## Technical Implementation

### State Management
```typescript
// Calendar Store Integration
const calendarStore = useCalendarStore()
const calendars = computed(() => readValue(calendarStore.value?.calendars) || [])
const selectedCalendarIds = computed(() => readValue(calendarStore.value?.selectedCalendarIds) || [])
const loadingEvents = computed(() => !readValue(calendarStore.value?.loadingEvents))
const visibleEvents = computed(() => readValue(calendarStore.value?.visibleEvents) || [])
```

### Computed Properties
- `monthView`: Generates week-based month grid
- `getEventsForDate(date)`: Filters events for specific date
- `isToday(date)`: Checks if date is today
- `formatDate(date)`: Locale-aware date formatting
- `formatTime(date)`: Time formatting with locale support
- `titleText`: Dynamic header title based on view mode
- `todayText`: Formatted today's date
- `calendarViewMode`: Current view mode (month/week/day)

### Event Handling
- `openEventMenu(evt, event)`: Opens context menu for event
- `editEventFromMenu()`: Opens event editor
- `deleteEventFromMenu()`: Deletes event with confirmation
- `openEventEditor(event)`: Opens event creation/editing modal
- `handleGlobalKey(evt)`: Global keyboard shortcut handler

### Lifecycle Hooks
- `onMounted()`: Initializes calendars and events, sets up event listeners
- `onUnmounted()`: Cleans up event listeners
- `watch(currentDate)`: Refreshes events when date changes

## Template Structure

### Layout
```
.calendar-view
├── .calendar-header
│   ├── .calendar-nav (navigation buttons)
│   ├── .calendar-title (current date/range)
│   └── .calendar-actions (view mode buttons, new event)
├── .calendar-sidebar
│   ├── .calendar-list (calendar selection)
│   └── calendar checkboxes with color indicators
└── .calendar-content
    ├── .month-view (month grid with day headers)
    │   ├── .calendar-weekdays (day headers)
    │   └── .calendar-grid (day cells with events)
    └── .agenda-view (event list fallback)
        └── .agenda-event (event items with details)
```

### Event Display
- **Month View**: Compact event items with time and title
- **Agenda View**: Detailed event cards with:
  - Date
  - Time range
  - Title
  - Location
  - Description
  - Color-coded border

### Context Menu
- Edit button
- Delete button (with danger styling)

## Styling

### CSS Classes
- `.calendar-view`: Main container (flex column, 100% height)
- `.calendar-header`: Navigation and title area
- `.calendar-nav`: Navigation buttons
- `.calendar-title`: Title display
- `.calendar-actions`: Action buttons
- `.calendar-sidebar`: Calendar list sidebar
- `.calendar-content`: Main content area
- `.month-view`: Month grid layout
- `.calendar-weekdays`: Day header row
- `.calendar-grid`: Calendar grid
- `.day-cell`: Individual day cell
- `.event-item`: Event display item
- `.agenda-view`: Agenda list view
- `.agenda-event`: Agenda event item
- `.context-action`: Context menu button

### Color System
- Uses CSS variables for theming
- Calendar-specific colors from store
- Background color: `var(--bg)`
- Panel color: `var(--panel)`
- Border color: `var(--border)`

## Integration Points

### Calendar Store
- `useCalendarStore()`: Pinia store for calendar state
- Methods:
  - `refreshCalendars()`: Reload calendar list
  - `refreshEvents()`: Reload events
  - `openEventEditor(event)`: Open event editor modal
  - `deleteEvent(id)`: Delete event

### Email Store
- Fallback calendar store if main store unavailable
- Ensures calendar functionality even if primary store fails

## Data Flow

1. **Initialization**
   - Component mounts
   - Calendar store is loaded
   - Calendars and events are fetched
   - Event listeners are attached

2. **Navigation**
   - User clicks navigation buttons
   - Current date is updated
   - Events are refreshed for new date range
   - View is re-rendered

3. **Event Interaction**
   - User clicks event
   - Event ID is selected
   - Right-click opens context menu
   - User selects action (edit/delete)
   - Store method is called
   - View is updated

4. **View Mode Change**
   - User clicks view mode button
   - Calendar view mode is updated
   - Template conditionally renders appropriate view
   - Events are reformatted for new view

## Key Algorithms

### Month View Generation
```typescript
// Calculate first day of month and starting day of week
const firstDay = new Date(year, month, 1)
const lastDay = new Date(year, month + 1, 0)
const daysInMonth = lastDay.getDate()
const startingDayOfWeek = firstDay.getDay()

// Build weeks array with empty cells for days before month starts
// Add all days of month
// Add empty cells for days after month ends
```

### Event Filtering
```typescript
// Filter events by date
const eventDate = new Date(event.start).toISOString().split('T')[0]
const targetDate = date.toISOString().split('T')[0]
return eventDate === targetDate
```

### Today Detection
```typescript
// Compare date components
return date.getDate() === today.getDate() &&
       date.getMonth() === today.getMonth() &&
       date.getFullYear() === today.getFullYear()
```

## Responsive Design
- Flexbox-based layout
- Sidebar for calendar list
- Main content area for calendar grid
- Adapts to different screen sizes

## Accessibility Features
- Semantic HTML structure
- Keyboard navigation support
- Context menus for actions
- Clear visual indicators for selected items
- Color-coded calendars for distinction

## Performance Considerations
- Computed properties for efficient re-rendering
- Event filtering by date range
- Lazy loading of events
- Conditional rendering of views
- Event listener cleanup on unmount

## Dependencies
- Vue 3 (Composition API)
- TypeScript
- Pinia (state management)
- Calendar Store module
- Email Store (fallback)

## Potential Improvements for JMAP Webmail Integration

1. **JMAP Event Sync**: Implement real-time event synchronization with JMAP server
2. **Recurring Events**: Add support for recurring event patterns
3. **Event Reminders**: Implement notification system for upcoming events
4. **Drag & Drop**: Add drag-and-drop for event rescheduling
5. **Event Categories**: Support event categorization and filtering
6. **Time Zone Support**: Handle different time zones for events
7. **Collaborative Features**: Support shared calendars and invitations
8. **Search**: Add event search functionality
9. **Export/Import**: Support iCalendar format import/export
10. **Mobile Optimization**: Enhanced mobile calendar experience

## JMAP Integration (test-calendars.js)

The stormbox repository includes a test script (`test-calendars.js`) that demonstrates JMAP calendar integration:

### JMAP Authentication Flow
```javascript
// Step 1: Get session
const authHeader = Basic ${Buffer.from(`${username}:${password}`).toString('base64')}
const sessionUrl = ${serverUrl}/.well-known/jmap
const sessionResponse = await fetch(sessionUrl, {
  method: 'GET',
  headers: { 'Authorization': authHeader }
})
const session = await sessionResponse.json()
```

### Calendar Account Discovery
```javascript
// Step 2: Get calendar account ID
const calendarAccountId = session.primaryAccounts['urn:ietf:params:jmap:calendars']
if (!calendarAccountId) {
  throw new Error('No calendar account found')
}
```

### Calendar Fetching via JMAP
```javascript
// Step 3: Fetch calendars using Calendar/get
const jmapRequest = {
  using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:calendars'],
  methodCalls: [
    ['Calendar/get', {
      accountId: calendarAccountId
    }, '0']
  ]
}

const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Authorization': authHeader,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(jmapRequest)
})
```

### Response Parsing
```javascript
// Step 4: Parse response
const methodResponse = result.methodResponses?.[0]
if (!methodResponse) {
  throw new Error('No method response in result')
}

const [responseMethod, responseData, callId] = methodResponse

// Check for errors
if (responseMethod.endsWith('/error')) {
  throw new Error(`Server error: ${responseData.type} - ${responseData.description}`)
}
```

### Calendar Data Structure
The JMAP response returns calendars with the following properties:
- `id`: Calendar identifier
- `name`: Calendar display name
- `description`: Calendar description
- `color`: Calendar color (hex code)
- `isDefault`: Whether calendar is default
- `sortOrder`: Calendar sort order

### Calendar Processing
```javascript
// Process calendars
const calendars = responseData.list || []
calendars.forEach((calendar, index) => {
  console.log(`Calendar ${index + 1}:`)
  console.log(`  ID: ${calendar.id}`)
  console.log(`  Name: ${calendar.name || 'N/A'}`)
  console.log(`  Description: ${calendar.description || 'N/A'}`)
  console.log(`  Color: ${calendar.color || 'N/A'}`)
  console.log(`  Is Default: ${calendar.isDefault || false}`)
  console.log(`  Sort Order: ${calendar.sortOrder || 0}`)
})

return calendars
```

### Error Handling
The script includes comprehensive error handling:
- HTTP response validation
- Method response validation
- JMAP error detection
- Stack trace logging
- Detailed error messages

## JMAP Implementation Recommendations

### For JMAP Webmail Integration:

1. **Session Management**
   - Implement session caching to avoid repeated authentication
   - Handle session expiration and refresh
   - Store API URL from session response

2. **Calendar Operations**
   - Implement Calendar/get for fetching calendars
   - Implement Calendar/set for creating/updating calendars
   - Implement Calendar/changes for sync

3. **Event Operations**
   - Implement CalendarEvent/get for fetching events
   - Implement CalendarEvent/set for creating/updating events
   - Implement CalendarEvent/changes for sync
   - Support recurring events with RRULE

4. **Error Handling**
   - Validate all JMAP responses
   - Handle rate limiting
   - Implement retry logic
   - Log detailed error information

5. **Performance**
   - Batch JMAP requests when possible
   - Implement pagination for large result sets
   - Cache calendar metadata
   - Use incremental sync with changes

6. **Data Synchronization**
   - Track state tokens for incremental updates
   - Implement conflict resolution
   - Handle offline scenarios
   - Sync on app startup and periodically

## Conclusion
The stormbox calendar implementation provides a solid foundation for calendar functionality with multiple view modes, event management, and calendar organization. It uses modern Vue 3 patterns and integrates with a Pinia store for state management. The included JMAP integration test script demonstrates the proper authentication and calendar fetching workflow using the JMAP protocol. The implementation is well-structured and could serve as a reference for implementing similar features in the JMAP webmail application.
