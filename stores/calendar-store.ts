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

      fetchCalendars: async (client) => {
        set({ isLoading: true, error: null });
        try {
          // This would use client.getCalendars() if implemented in JMAP client
          // For now, we'll set empty array until JMAP client supports it
          set({ calendars: [], isLoading: false });
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
          // This would use client.createCalendar() if implemented
          console.log("Creating calendar:", calendar);
          set({ isLoading: false });
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
          // This would use client.updateCalendar()
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
          // This would use client.deleteCalendar()
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
          // This would use client.getCalendarEvents()
          set({ events: [], isLoading: false });
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
          // This would use client.createCalendarEvent()
          const newEvent: CalendarEvent = {
            id: `event_${Date.now()}`,
            ...event,
          };
          set((state) => ({
            events: [...state.events, newEvent],
            isLoading: false,
          }));
        } catch (error) {
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
          // This would use client.updateCalendarEvent()
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
          // This would use client.deleteCalendarEvent()
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
        if (!get().supportsCalendars) return;

        set({ isSyncing: true, error: null });
        try {
          // This would call client.getCalendars() and client.getCalendarEvents()
          set({
            isSyncing: false,
            lastSyncTime: Date.now(),
          });
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
          // This would fetch updated calendars/events
          console.log("Calendar change detected:", calendarIds);
        } catch (error) {
          console.error("Error handling calendar changes:", error);
        }
      },

      setViewMode: (mode) => {
        set({ viewMode: mode });
      },

      setSelectedDate: (date) => {
        set({ selectedDate: date });
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
