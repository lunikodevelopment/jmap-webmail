/**
 * Email Tracking Types
 * Defines types for tracking email opens, clicks, and delivery status
 */

export type TrackingEventType = 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';

export interface TrackingPixel {
  id: string;
  emailId: string;
  trackingId: string;
  createdAt: Date;
}

export interface TrackingEvent {
  id: string;
  emailId: string;
  trackingId: string;
  eventType: TrackingEventType;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  location?: {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  clickedLink?: string;
}

export interface EmailTrackingData {
  id: string;
  emailId: string;
  trackingId: string;
  recipientEmail: string;
  sentAt: Date;
  deliveredAt?: Date;
  firstOpenedAt?: Date;
  lastOpenedAt?: Date;
  openCount: number;
  clickCount: number;
  clickedLinks: string[];
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'bounced' | 'failed';
  events: TrackingEvent[];
}

export interface TrackingSettings {
  enableTracking: boolean;
  trackOpens: boolean;
  trackClicks: boolean;
  trackDelivery: boolean;
  notifyOnOpen: boolean;
  notifyOnClick: boolean;
  retentionDays: number; // How long to keep tracking data
}
