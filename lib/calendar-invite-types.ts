/**
 * Calendar Invite Types
 * Defines types for handling calendar invitations and RSVP
 */

export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'tentative' | 'no-response';
export type InviteRole = 'organizer' | 'attendee' | 'optional';

export interface CalendarInvite {
  id: string;
  emailId: string;
  eventId: string;
  eventTitle: string;
  eventDescription?: string;
  organizer: {
    name: string;
    email: string;
  };
  attendees: CalendarAttendee[];
  startTime: Date;
  endTime: Date;
  location?: string;
  timezone?: string;
  recurrence?: RecurrenceRule;
  status: InviteStatus;
  role: InviteRole;
  createdAt: Date;
  updatedAt: Date;
  icalData?: string; // Raw iCal data
}

export interface CalendarAttendee {
  id: string;
  name: string;
  email: string;
  status: InviteStatus;
  role: InviteRole;
  responseTime?: Date;
  comment?: string;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  count?: number;
  until?: Date;
  byDay?: string[];
  byMonth?: number[];
  byMonthDay?: number[];
}

export interface InviteResponse {
  id: string;
  inviteId: string;
  status: InviteStatus;
  comment?: string;
  respondedAt: Date;
  sendNotification: boolean;
}

export interface InviteNotification {
  id: string;
  inviteId: string;
  type: 'new_invite' | 'reminder' | 'update' | 'cancellation';
  sentAt: Date;
  read: boolean;
}

export interface CalendarInviteSettings {
  autoAcceptFromTrustedSenders: boolean;
  trustedSenders: string[];
  sendResponseNotifications: boolean;
  showInvitesInCalendar: boolean;
  defaultResponse: InviteStatus;
  reminderMinutes: number[];
}
