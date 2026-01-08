import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ScheduledEmail, EmailSchedule, ScheduleReminder } from '@/lib/email-scheduling-types';

interface EmailSchedulingState {
  // Scheduled emails
  scheduledEmails: ScheduledEmail[];
  
  // Reminders
  reminders: ScheduleReminder[];
  
  // UI state
  isScheduling: boolean;
  selectedScheduleId: string | null;
  
  // Actions
  scheduleEmail: (email: ScheduledEmail) => void;
  updateSchedule: (scheduleId: string, updates: Partial<EmailSchedule>) => void;
  cancelSchedule: (scheduleId: string) => void;
  getScheduledEmail: (scheduleId: string) => ScheduledEmail | undefined;
  getScheduledEmails: () => ScheduledEmail[];
  getUpcomingSchedules: (hours?: number) => ScheduledEmail[];
  
  // Reminders
  addReminder: (reminder: ScheduleReminder) => void;
  markReminderNotified: (reminderId: string) => void;
  getPendingReminders: () => ScheduleReminder[];
  
  // UI
  setIsScheduling: (isScheduling: boolean) => void;
  setSelectedScheduleId: (scheduleId: string | null) => void;
}

export const useEmailSchedulingStore = create<EmailSchedulingState>()(
  persist(
    (set, get) => ({
      scheduledEmails: [],
      reminders: [],
      isScheduling: false,
      selectedScheduleId: null,

      scheduleEmail: (email) =>
        set((state) => ({
          scheduledEmails: [...state.scheduledEmails, email],
        })),

      updateSchedule: (scheduleId, updates) =>
        set((state) => ({
          scheduledEmails: state.scheduledEmails.map((email) =>
            email.schedule.id === scheduleId
              ? {
                  ...email,
                  schedule: {
                    ...email.schedule,
                    ...updates,
                    updatedAt: new Date(),
                  },
                }
              : email
          ),
        })),

      cancelSchedule: (scheduleId) =>
        set((state) => ({
          scheduledEmails: state.scheduledEmails.map((email) =>
            email.schedule.id === scheduleId
              ? {
                  ...email,
                  schedule: {
                    ...email.schedule,
                    status: 'cancelled' as const,
                    updatedAt: new Date(),
                  },
                }
              : email
          ),
        })),

      getScheduledEmail: (scheduleId) => {
        const state = get();
        return state.scheduledEmails.find((e) => e.schedule.id === scheduleId);
      },

      getScheduledEmails: () => {
        const state = get();
        return state.scheduledEmails.filter((e) => e.schedule.status === 'scheduled');
      },

      getUpcomingSchedules: (hours = 24) => {
        const state = get();
        const now = new Date();
        const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

        return state.scheduledEmails.filter(
          (e) =>
            e.schedule.status === 'scheduled' &&
            e.schedule.scheduledTime >= now &&
            e.schedule.scheduledTime <= futureTime
        );
      },

      addReminder: (reminder) =>
        set((state) => ({
          reminders: [...state.reminders, reminder],
        })),

      markReminderNotified: (reminderId) =>
        set((state) => ({
          reminders: state.reminders.map((r) =>
            r.id === reminderId ? { ...r, notified: true } : r
          ),
        })),

      getPendingReminders: () => {
        const state = get();
        const now = new Date();
        return state.reminders.filter((r) => !r.notified && r.reminderTime <= now);
      },

      setIsScheduling: (isScheduling) => set({ isScheduling }),

      setSelectedScheduleId: (scheduleId) => set({ selectedScheduleId: scheduleId }),
    }),
    {
      name: 'email-scheduling-store',
      version: 1,
    }
  )
);
