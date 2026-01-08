/**
 * Remember Me Types
 * Defines types for persistent login functionality
 */

export interface RememberMeToken {
  id: string;
  email: string;
  token: string;
  hashedToken: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  deviceName?: string;
  isActive: boolean;
}

export interface RememberMeSettings {
  enabled: boolean;
  maxTokens: number; // Maximum number of remember me tokens per user
  tokenExpirationDays: number;
  requireConfirmation: boolean; // Require email confirmation for new devices
  notifyOnNewDevice: boolean;
}

export interface RememberMeDevice {
  id: string;
  email: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  osName: string;
  browserName: string;
  lastUsedAt: Date;
  createdAt: Date;
  isCurrentDevice: boolean;
}
