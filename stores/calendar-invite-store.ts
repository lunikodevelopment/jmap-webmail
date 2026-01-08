import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  CalendarInvite,
  InviteResponse,
  InviteNotification,
  CalendarInviteSettings,
  InviteStatus,
} from '@/lib/calendar-invite-types';

interface CalendarInviteState {
  // Invites
  invites: CalendarInvite[];
  
  // Responses
  responses: InviteResponse[];
  
  // Notifications
  notifications: InviteNotification[];
  
  // Settings
  settings: CalendarInviteSettings;
  
  // UI state
  selectedInviteId: string | null;
  
  // Invite Actions
  addInvite: (invite: CalendarInvite) => void;
  updateInvite: (id: string, updates: Partial<CalendarInvite>) => void;
  deleteInvite: (id: string) => void;
  getInvite: (id: string) => CalendarInvite | undefined;
  getInvitesByEmail: (email: string) => CalendarInvite[];
  getPendingInvites: () => CalendarInvite[];
  getUpcomingInvites: (days?: number) => CalendarInvite[];
  
  // Response Actions
  respondToInvite: (inviteId: string, response: InviteResponse) => void;
  getResponse: (inviteId: string) => InviteResponse | undefined;
  
  // Notification Actions
  addNotification: (notification: InviteNotification) => void;
  markNotificationAsRead: (notificationId: string) => void;
  deleteNotification: (notificationId: string) => void;
  getUnreadNotifications: () => InviteNotification[];
  
  // Settings
  updateSettings: (settings: Partial<CalendarInviteSettings>) => void;
  getSettings: () => CalendarInviteSettings;
  
  // Utilities
  getInvitesByStatus: (status: InviteStatus) => CalendarInvite[];
  getInvitesByOrganizer: (organizerEmail: string) => CalendarInvite[];
  
  // UI
  setSelectedInviteId: (id: string | null) => void;
}

const DEFAULT_SETTINGS: CalendarInviteSettings = {
  autoAcceptFromTrustedSenders: false,
  trustedSenders: [],
  sendResponseNotifications: true,
  showInvitesInCalendar: true,
  defaultResponse: 'tentative',
  reminderMinutes: [15, 60, 1440], // 15 min, 1 hour, 1 day
};

export const useCalendarInviteStore = create<CalendarInviteState>()(
  persist(
    (set, get) => ({
      invites: [],
      responses: [],
      notifications: [],
      settings: DEFAULT_SETTINGS,
      selectedInviteId: null,

      // Invite Actions
      addInvite: (invite) =>
        set((state) => ({
          invites: [...state.invites, invite],
        })),

      updateInvite: (id, updates) =>
        set((state) => ({
          invites: state.invites.map((i) =>
            i.id === id ? { ...i, ...updates, updatedAt: new Date() } : i
          ),
        })),

      deleteInvite: (id) =>
        set((state) => ({
          invites: state.invites.filter((i) => i.id !== id),
        })),

      getInvite: (id) => {
        const state = get();
        return state.invites.find((i) => i.id === id);
      },

      getInvitesByEmail: (email) => {
        const state = get();
        return state.invites.filter(
          (i) =>
            i.organizer.email === email ||
            i.attendees.some((a) => a.email === email)
        );
      },

      getPendingInvites: () => {
        const state = get();
        return state.invites.filter((i) => i.status === 'pending');
      },

      getUpcomingInvites: (days = 7) => {
        const state = get();
        const now = new Date();
        const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

        return state.invites.filter(
          (i) => i.startTime >= now && i.startTime <= futureDate
        );
      },

      // Response Actions
      respondToInvite: (inviteId, response) =>
        set((state) => {
          const existing = state.responses.find((r) => r.inviteId === inviteId);
          const newResponses = existing
            ? state.responses.map((r) =>
                r.inviteId === inviteId ? { ...response, id: r.id } : r
              )
            : [...state.responses, response];

          return {
            responses: newResponses,
            invites: state.invites.map((i) =>
              i.id === inviteId ? { ...i, status: response.status } : i
            ),
          };
        }),

      getResponse: (inviteId) => {
        const state = get();
        return state.responses.find((r) => r.inviteId === inviteId);
      },

      // Notification Actions
      addNotification: (notification) =>
        set((state) => ({
          notifications: [...state.notifications, notification],
        })),

      markNotificationAsRead: (notificationId) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          ),
        })),

      deleteNotification: (notificationId) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== notificationId),
        })),

      getUnreadNotifications: () => {
        const state = get();
        return state.notifications.filter((n) => !n.read);
      },

      // Settings
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      getSettings: () => {
        const state = get();
        return state.settings;
      },

      // Utilities
      getInvitesByStatus: (status) => {
        const state = get();
        return state.invites.filter((i) => i.status === status);
      },

      getInvitesByOrganizer: (organizerEmail) => {
        const state = get();
        return state.invites.filter((i) => i.organizer.email === organizerEmail);
      },

      // UI
      setSelectedInviteId: (id) => set({ selectedInviteId: id }),
    }),
    {
      name: 'calendar-invite-store',
      version: 1,
    }
  )
);
