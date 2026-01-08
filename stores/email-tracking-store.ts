import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EmailTrackingData, TrackingEvent, TrackingSettings } from '@/lib/email-tracking-types';

interface EmailTrackingState {
  // Tracking data
  trackingData: EmailTrackingData[];
  
  // Settings
  settings: TrackingSettings;
  
  // UI state
  selectedTrackingId: string | null;
  
  // Actions
  addTrackingData: (data: EmailTrackingData) => void;
  recordTrackingEvent: (emailId: string, event: TrackingEvent) => void;
  getTrackingData: (emailId: string) => EmailTrackingData | undefined;
  getTrackingDataByTrackingId: (trackingId: string) => EmailTrackingData | undefined;
  getAllTrackingData: () => EmailTrackingData[];
  
  // Statistics
  getOpenRate: (emailIds: string[]) => number;
  getClickRate: (emailIds: string[]) => number;
  getDeliveryRate: (emailIds: string[]) => number;
  
  // Settings
  updateSettings: (settings: Partial<TrackingSettings>) => void;
  getSettings: () => TrackingSettings;
  
  // Cleanup
  deleteTrackingData: (emailId: string) => void;
  cleanupOldData: (retentionDays: number) => void;
  
  // UI
  setSelectedTrackingId: (trackingId: string | null) => void;
}

const DEFAULT_SETTINGS: TrackingSettings = {
  enableTracking: true,
  trackOpens: true,
  trackClicks: true,
  trackDelivery: true,
  notifyOnOpen: false,
  notifyOnClick: false,
  retentionDays: 90,
};

export const useEmailTrackingStore = create<EmailTrackingState>()(
  persist(
    (set, get) => ({
      trackingData: [],
      settings: DEFAULT_SETTINGS,
      selectedTrackingId: null,

      addTrackingData: (data) =>
        set((state) => ({
          trackingData: [...state.trackingData, data],
        })),

      recordTrackingEvent: (emailId, event) =>
        set((state) => ({
          trackingData: state.trackingData.map((data) =>
            data.emailId === emailId
              ? {
                  ...data,
                  events: [...data.events, event],
                  openCount:
                    event.eventType === 'opened'
                      ? data.openCount + 1
                      : data.openCount,
                  clickCount:
                    event.eventType === 'clicked'
                      ? data.clickCount + 1
                      : data.clickCount,
                  clickedLinks:
                    event.eventType === 'clicked' && event.clickedLink
                      ? [...new Set([...data.clickedLinks, event.clickedLink])]
                      : data.clickedLinks,
                  firstOpenedAt:
                    event.eventType === 'opened' && !data.firstOpenedAt
                      ? event.timestamp
                      : data.firstOpenedAt,
                  lastOpenedAt:
                    event.eventType === 'opened'
                      ? event.timestamp
                      : data.lastOpenedAt,
                  status: event.eventType as any,
                }
              : data
          ),
        })),

      getTrackingData: (emailId) => {
        const state = get();
        return state.trackingData.find((d) => d.emailId === emailId);
      },

      getTrackingDataByTrackingId: (trackingId) => {
        const state = get();
        return state.trackingData.find((d) => d.trackingId === trackingId);
      },

      getAllTrackingData: () => {
        const state = get();
        return state.trackingData;
      },

      getOpenRate: (emailIds) => {
        const state = get();
        const data = state.trackingData.filter((d) => emailIds.includes(d.emailId));
        if (data.length === 0) return 0;
        const opened = data.filter((d) => d.openCount > 0).length;
        return (opened / data.length) * 100;
      },

      getClickRate: (emailIds) => {
        const state = get();
        const data = state.trackingData.filter((d) => emailIds.includes(d.emailId));
        if (data.length === 0) return 0;
        const clicked = data.filter((d) => d.clickCount > 0).length;
        return (clicked / data.length) * 100;
      },

      getDeliveryRate: (emailIds) => {
        const state = get();
        const data = state.trackingData.filter((d) => emailIds.includes(d.emailId));
        if (data.length === 0) return 0;
        const delivered = data.filter(
          (d) => d.status === 'delivered' || d.status === 'opened'
        ).length;
        return (delivered / data.length) * 100;
      },

      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      getSettings: () => {
        const state = get();
        return state.settings;
      },

      deleteTrackingData: (emailId) =>
        set((state) => ({
          trackingData: state.trackingData.filter((d) => d.emailId !== emailId),
        })),

      cleanupOldData: (retentionDays) =>
        set((state) => {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

          return {
            trackingData: state.trackingData.filter(
              (d) => new Date(d.sentAt) > cutoffDate
            ),
          };
        }),

      setSelectedTrackingId: (trackingId) => set({ selectedTrackingId: trackingId }),
    }),
    {
      name: 'email-tracking-store',
      version: 1,
    }
  )
);
