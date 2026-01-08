import { create } from "zustand";
import { persist } from "zustand/middleware";
import { JMAPClient } from "@/lib/jmap/client";
import type { Calendar, CalendarEvent } from "@/lib/jmap/types";

interface CalendarStore {
  calendars: Calendar[];
  events: CalendarEvent[];
  selectedCalendarId: string | null;
  selectedEventId: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  
  // Filter state
  viewMode: 'month' | 'week' | 'day' | 'agenda';
  selectedDate: Date;
  supportsCalendars: boolean;
  lastSyncTime: number | null;
  
  // Calendar visibility and selection
  selectedCalendarIds: Set<string>;
  visibleEvents: CalendarEvent[];
  loadingEvents: boolean;

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
  setViewMode: (mode: 'month' | 'week' | 'day' | 'agenda') => void;
  setSelectedDate: (date: Date) => void;
  
  // Calendar visibility
  toggleCalendarVisibility: (calendarId: string) => void;
  setSelectedCalendars: (calendarIds: string[]) => void;
  updateVisibleEvents: () => void;

  // UI state
  clearError: () => void;
}

export const useCalendarStore = create<CalendarStore>()(
  persist(
    (set, get) => ({
      calendars: [],
      events: [],
      selectedCalendarId: null,
      selectedEventId: null,
      isLoading: false,
      isSyncing: false,
      error: null,
      viewMode: 'month',
      selectedDate: new Date(),
      supportsCalendars: false,
      lastSyncTime: null,
      selectedCalendarIds: new Set<string>(),
      visibleEvents: [],
      loadingEvents: false,

      fetchCalendars: async (client) => {
        set({ isLoading: true, error: null });
        try {
          const calendars = await client.getCalendars();
          set({ calendars, isLoading: false });
        } catch (error) {
          console.error("Error fetching calendars:", error);
          set({
            error: error instanceof Error ? error.message : "Failed to fetch calendars",
            isLoading: false,
          });
        }
      },

      createCalendar: async (client, calendar) => {
        set({ isLoading: true, error: null });
        try {
          const calendarId = await client.createCalendar(
            calendar.name,
            calendar.description,
            calendar.color
          );
          const newCalendar: Calendar = {
            id: calendarId,
            ...calendar,
          };
          set((state) => ({
            calendars: [...state.calendars, newCalendar],
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to create calendar",
            isLoading: false,
          });
          throw error;
        }
      },

      updateCalendar: async (client, calendarId, updates) => {
        set({ isLoading: true, error: null });
        try {
          await client.updateCalendar(calendarId, updates);
          set((state) => ({
            calendars: state.calendars.map((c) =>
              c.id === calendarId ? { ...c, ...updates } : c
            ),
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to update calendar",
            isLoading: false,
          });
          throw error;
        }
      },

      deleteCalendar: async (client, calendarId) => {
        set({ isLoading: true, error: null });
        try {
          await client.deleteCalendar(calendarId);
          set((state) => ({
            calendars: state.calendars.filter((c) => c.id !== calendarId),
            selectedCalendarId:
              state.selectedCalendarId === calendarId
                ? null
                : state.selectedCalendarId,
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to delete calendar",
            isLoading: false,
          });
          throw error;
        }
      },

      selectCalendar: (calendarId) => {
        set({ selectedCalendarId: calendarId });
      },

      fetchEvents: async (client, calendarId) => {
        set({ isLoading: true, error: null });
        try {
          const targetCalendarId = calendarId || get().selectedCalendarId;
          if (!targetCalendarId) {
            set({ events: [], isLoading: false });
            return;
          }
          const { events } = await client.getCalendarEvents(targetCalendarId);
          set({ events, isLoading: false });
        } catch (error) {
          console.error("Error fetching events:", error);
          set({
            error: error instanceof Error ? error.message : "Failed to fetch events",
            isLoading: false,
          });
        }
      },

      getEventsForDate: (date) => {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return get().events.filter((event) => {
          const eventStart = new Date(event.startTime);
          const eventEnd = new Date(event.endTime);
          return eventStart <= endOfDay && eventEnd >= startOfDay;
        });
      },

      getEventsForDateRange: (startDate, endDate) => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return get().events.filter((event) => {
          const eventStart = new Date(event.startTime);
          const eventEnd = new Date(event.endTime);
          return eventStart <= end && eventEnd >= start;
        });
      },

      createEvent: async (client, event) => {
        set({ isLoading: true, error: null });
        try {
          const calendarId = event.calendarId || get().selectedCalendarId;
          if (!calendarId) {
            throw new Error('No calendar selected');
          }
          
          // Ensure dates are ISO strings
          const eventToCreate = {
            ...event,
            startTime: typeof event.startTime === 'string' ? event.startTime : new Date(event.startTime).toISOString(),
            endTime: typeof event.endTime === 'string' ? event.endTime : new Date(event.endTime).toISOString(),
          };
          
          const eventId = await client.createCalendarEvent(calendarId, eventToCreate);
          const newEvent: CalendarEvent = {
            id: eventId,
            ...event,
          };
          set((state) => ({
            events: [...state.events, newEvent],
            isLoading: false,
          }));
          console.log('Event created successfully:', newEvent);
        } catch (error) {
          console.error('Error creating event:', error);
          set({
            error: error instanceof Error ? error.message : "Failed to create event",
            isLoading: false,
          });
          throw error;
        }
      },

      updateEvent: async (client, eventId, updates) => {
        set({ isLoading: true, error: null });
        try {
          await client.updateCalendarEvent(eventId, updates);
          set((state) => ({
            events: state.events.map((e) =>
              e.id === eventId ? { ...e, ...updates } : e
            ),
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to update event",
            isLoading: false,
          });
          throw error;
        }
      },

      deleteEvent: async (client, eventId) => {
        set({ isLoading: true, error: null });
        try {
          await client.deleteCalendarEvent(eventId);
          set((state) => ({
            events: state.events.filter((e) => e.id !== eventId),
            selectedEventId:
              state.selectedEventId === eventId ? null : state.selectedEventId,
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to delete event",
            isLoading: false,
          });
          throw error;
        }
      },

      selectEvent: (eventId) => {
        set({ selectedEventId: eventId });
      },

      initializeSync: async (client) => {
        try {
          const capabilities = client.getCapabilities();
          const supportsCalendars =
            capabilities && "urn:ietf:params:jmap:calendars" in capabilities;
          set({ supportsCalendars });

          if (supportsCalendars) {
            console.log("Server supports JMAP Calendars, initializing sync...");
            await get().syncCalendars(client);
          }
        } catch (error) {
          console.error("Error initializing calendar sync:", error);
        }
      },

      syncCalendars: async (client) => {
        if (!get().supportsCalendars) {
          console.log('Calendar sync skipped: server does not support calendars');
          return;
        }

        set({ isSyncing: true, error: null });
        try {
          // Fetch all calendars
          console.log('Starting calendar sync...');
          const calendars = await client.getCalendars();
          console.log('Fetched calendars:', calendars);
          
          if (!calendars || calendars.length === 0) {
            console.log('No calendars found on server');
            set({
              calendars: [],
              events: [],
              isSyncing: false,
              lastSyncTime: Date.now(),
            });
            return;
          }
          
          // Fetch events for each calendar
          let allEvents: CalendarEvent[] = [];
          for (const calendar of calendars) {
            try {
              console.log(`Fetching events for calendar: ${calendar.id} (${calendar.name})`);
              const { events, total } = await client.getCalendarEvents(calendar.id);
              console.log(`Fetched ${events.length} events for calendar ${calendar.id} (total: ${total})`);
              allEvents = [...allEvents, ...events];
            } catch (error) {
              console.error(`Failed to fetch events for calendar ${calendar.id}:`, error);
              // Continue with other calendars even if one fails
            }
          }
          
          console.log(`Calendar sync: setting ${allEvents.length} total events`);
          set({
            calendars,
            events: allEvents,
            isSyncing: false,
            lastSyncTime: Date.now(),
          });
          
          // Auto-select all calendars on first sync
          if (get().selectedCalendarIds.size === 0 && calendars.length > 0) {
            const calendarIds = calendars.map(c => c.id);
            console.log('Auto-selecting all calendars on first sync:', calendarIds);
            set({ selectedCalendarIds: new Set(calendarIds) });
            get().updateVisibleEvents();
          } else {
            // Update visible events
            console.log('Updating visible events...');
            get().updateVisibleEvents();
          }
          
          console.log(`Calendar sync complete: ${calendars.length} calendars, ${allEvents.length} events`);
        } catch (error) {
          console.error("Error syncing calendars:", error);
          set({
            isSyncing: false,
            error: error instanceof Error ? error.message : "Failed to sync calendars",
          });
        }
      },

      handleCalendarChange: async (calendarIds, client) => {
        try {
          // Fetch updated calendars and events for changed calendars
          console.log("Calendar change detected:", calendarIds);
          
          const updatedCalendars = await Promise.all(
            calendarIds.map(id => client.getCalendar(id))
          );
          
          let updatedEvents: CalendarEvent[] = [];
          for (const calendarId of calendarIds) {
            const { events } = await client.getCalendarEvents(calendarId);
            updatedEvents = [...updatedEvents, ...events];
          }
          
          set((state) => ({
            calendars: state.calendars.map(c => {
              const updated = updatedCalendars.find(u => u?.id === c.id);
              return updated || c;
            }),
            events: [
              ...state.events.filter(e => !calendarIds.includes(e.calendarId)),
              ...updatedEvents,
            ],
          }));
        } catch (error) {
          console.error("Error handling calendar changes:", error);
        }
      },

      setViewMode: (mode) => {
        set({ viewMode: mode });
      },

      setSelectedDate: (date) => {
        set({ selectedDate: date instanceof Date ? date : new Date(date) });
      },

      toggleCalendarVisibility: (calendarId) => {
        set((state) => {
          const newSelectedIds = new Set(state.selectedCalendarIds);
          if (newSelectedIds.has(calendarId)) {
            newSelectedIds.delete(calendarId);
          } else {
            newSelectedIds.add(calendarId);
          }
          return { selectedCalendarIds: newSelectedIds };
        });
        get().updateVisibleEvents();
      },

      setSelectedCalendars: (calendarIds) => {
        set({ selectedCalendarIds: new Set(calendarIds) });
        get().updateVisibleEvents();
      },

      updateVisibleEvents: () => {
        const state = get();
        const visible = state.selectedCalendarIds.size === 0
          ? state.events
          : state.events.filter((event) =>
              state.selectedCalendarIds.has(event.calendarId)
            );
        console.log(`Updated visible events: ${visible.length} of ${state.events.length} total from ${state.selectedCalendarIds.size} selected calendars`);
        set({ visibleEvents: visible });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "calendar-store",
      partialize: (state) => ({
        viewMode: state.viewMode,
        selectedDate: state.selectedDate,
      }),
    }
  )
);
