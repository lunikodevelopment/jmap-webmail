/**
 * Multi-Account Types
 * Defines types for managing multiple email accounts
 */

export interface AccountCredentials {
  id: string;
  email: string;
  displayName?: string;
  jmapServer: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountSession {
  id: string;
  accountId: string;
  sessionToken: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface AccountProfile {
  id: string;
  accountId: string;
  displayName: string;
  profilePicture?: string;
  signature?: string;
  timezone: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountSettings {
  id: string;
  accountId: string;
  autoSync: boolean;
  syncInterval: number; // in seconds
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountSwitchHistory {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  switchedAt: Date;
}
