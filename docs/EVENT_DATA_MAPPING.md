# Implementing Proper Event Data Mapping

Based on the working Stormbox implementation, we need to map JMAP CalendarEvent responses to our CalendarEvent interface.

## Issue Analysis

The JMAP server returns CalendarEvent objects with specific property names that might differ from our interface. We need to properly map them.

## JMAP CalendarEvent Format (RFC 8984)

The actual JMAP response uses these properties:
- `id` - Event ID
- `calendarId` - Calendar ID  
- `title` - Event title
- `description` - Description
- `location` - Location
- `start` - Start time (ISO 8601) - **NOT `startTime`**
- `end` - End time (ISO 8601) - **NOT `endTime`**
- `duration` - Duration string (ISO 8601)
- `isAllDay` - All-day flag
- `timeZone` - Timezone - **NOT `timezone`**

## The Fix Needed

We need to add a data mapper in the JMAP client to convert JMAP properties to our interface properties.

```typescript
private mapJMAPEventToCalendarEvent(jmapEvent: any): CalendarEvent {
  return {
    id: jmapEvent.id,
    calendarId: jmapEvent.calendarId,
    title: jmapEvent.title || '',
    description: jmapEvent.description,
    location: jmapEvent.location,
    // Map JMAP 'start' to our 'startTime'
    startTime: jmapEvent.start || jmapEvent.startTime,
    // Map JMAP 'end' to our 'endTime'
    endTime: jmapEvent.end || jmapEvent.endTime,
    duration: jmapEvent.duration ? this.durationToSeconds(jmapEvent.duration) : undefined,
    isAllDay: jmapEvent.isAllDay,
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
}

private durationToSeconds(duration: string): number {
  // Parse ISO 8601 duration (e.g., "PT1H30M")
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;
  
  return hours * 3600 + minutes * 60 + seconds;
}
```

This ensures we properly map JMAP properties to our interface.
