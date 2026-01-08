/**
 * Email Scheduling Types
 * Defines types for scheduling emails to be sent at a later time
 */

export type ScheduleFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface EmailSchedule {
  id: string;
  emailId: string;
  scheduledTime: Date;
  frequency?: ScheduleFrequency;
  endDate?: Date;
  timezone: string;
  status: 'scheduled' | 'sent' | 'cancelled' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
}

export interface ScheduledEmail {
  id: string;
  draftId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments?: string[];
  schedule: EmailSchedule;
  reminderMinutes?: number; // Remind user X minutes before sending
}

export interface ScheduleReminder {
  id: string;
  scheduledEmailId: string;
  reminderTime: Date;
  notified: boolean;
}
